import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { defaultData } from './App';

// Initialize the PDF.js headless worker safely for Webpack/CRA environments.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extracts raw textual array blocks from DOCX or PDF payloads.
 */
async function extractRawText(file) {
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (extension === '.docx' || extension === '.doc') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value || "";
    }

    if (extension === '.pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;

        const numPages = pdf.numPages;
        let textStr = "";

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            let lastY = -1;
            let pageText = "";

            // Reconstruct genuine newlines by tracking the Y-coordinate matrix from the PDF canvas!
            for (let item of textContent.items) {
                if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 4) {
                    pageText += "\n";
                } else if (lastY !== -1 && item.str.trim() !== '') {
                    pageText += " ";
                }
                pageText += item.str.trim();
                lastY = item.transform[5];
            }
            textStr += pageText + "\n";
        }

        return textStr;
    }

    throw new Error("Unsupported file format for pure extraction.");
}

/**
 * Maps raw multi-page string into a structured internal JSON mapped precisely against the defaultData template schema.
 * Operates purely using highly deterministic Regex heuristics without calling any LLM API endpoints.
 */
export async function parseResumeFile(file) {
    const rawText = await extractRawText(file);
    const data = JSON.parse(JSON.stringify(defaultData()));
    const confidence = { personal: {}, experience: [], education: [], skills: 'low', projects: 'low', certifications: 'low', languages: 'low', achievements: 'low' };

    if (!rawText || !rawText.trim()) throw new Error("Could not detect valid text inside the document (may be a scanned image).");

    const rawLines = rawText.split('\n').map(l => l.replace(/\s{2,}/g, '  ').replace(/\s{2,}/g, ' ').trim()).filter(l => l);
    // De-duplication logic
    const lines = [...new Set(rawLines)];
    const text = lines.join('\n'); // Line separated for safer RegEx block testing

    const nameRegex = /^[A-Z][A-Za-z.\-']+(\s[A-Z][A-Za-z.\-']+)+$/;
    const nameLine = lines.slice(0, 10).find(l => nameRegex.test(l) && l.length < 40 && l.length > 5);

    if (nameLine) {
        data.personal.fullName = nameLine;
        confidence.personal.fullName = 'high';
    } else {
        confidence.personal.fullName = 'unmapped';
    }

    // Extract Job Title isolated from the Name constraint
    const titleLine = lines.slice(0, 10).find(l => /(Engineer|Developer|Manager|Designer|Analyst|Consultant|Architect|Specialist|Director|Lead|Scientist|Administrator)/i.test(l) && l.length < 60);
    if (titleLine && titleLine !== data.personal.fullName) {
        data.personal.title = titleLine;
    }

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        data.personal.email = emailMatch[1];
        confidence.personal.email = 'high';
    } else {
        confidence.personal.email = 'unmapped';
    }

    const phoneRegex = /(?:\+?(\d{1,3}))?[\s-]?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        let code = phoneMatch[1] || "1";
        data.personal.phone.number = phoneMatch[0].trim();
        confidence.personal.phone = 'high';
    } else {
        confidence.personal.phone = 'unmapped';
    }

    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|linkedin\.com\/[^\s]+|github\.com\/[^\s]+)/gi;
    const urlMatches = text.match(urlRegex) || [];
    if (urlMatches.length) {
        data.personal.linkedin = urlMatches.find(u => u.toLowerCase().includes('linkedin')) || urlMatches[0];
        const githubMatch = urlMatches.find(u => u.toLowerCase().includes('github'));
        if (githubMatch) data.personal.github = githubMatch;
        confidence.personal.linkedin = 'high';
    } else {
        confidence.personal.linkedin = 'unmapped';
    }

    // Extended Section Aliasing
    const sectionHeaders = /^(EXPERIENCE|EMPLOYMENT|WORK HISTORY|PROFESSIONAL EXPERIENCE|EDUCATION|ACADEMIC|SKILLS|TECHNICAL SKILLS|PROJECTS|CERTIFICATIONS|SUMMARY|PROFILE|LANGUAGES|ACHIEVEMENTS|PUBLICATIONS|INTERESTS|VOLUNTEERING)$/i;

    let currentSection = "SUMMARY";
    const sections = { SUMMARY: [], EXPERIENCE: [], EDUCATION: [], SKILLS: [], PROJECTS: [], CERTIFICATIONS: [], LANGUAGES: [], ACHIEVEMENTS: [], UNMAPPED: [] };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        let match = line.trim().match(sectionHeaders);
        if (match && line.length < 50) {
            let hdr = match[1].toUpperCase();
            if (['EMPLOYMENT', 'WORK HISTORY', 'PROFESSIONAL EXPERIENCE'].includes(hdr)) hdr = 'EXPERIENCE';
            if (['PROFILE'].includes(hdr)) hdr = 'SUMMARY';
            if (['TECHNICAL SKILLS'].includes(hdr)) hdr = 'SKILLS';
            if (['ACADEMIC'].includes(hdr)) hdr = 'EDUCATION';
            if (!sections[hdr]) sections[hdr] = [];
            currentSection = hdr;
            continue;
        }

        // Ignore top-level contact lines from being pushed randomly
        if (i < 8 && (line === data.personal.fullName || emailRegex.test(line) || phoneRegex.test(line))) continue;

        if (sections[currentSection]) {
            sections[currentSection].push(line);
        } else {
            sections.UNMAPPED.push(line);
        }
    }

    if (sections.SUMMARY.length) {
        data.summary = sections.SUMMARY.join(" ");
        confidence.summary = 'high';
    } else {
        confidence.summary = 'unmapped';
    }

    if (sections.SKILLS && sections.SKILLS.length) {
        const skillList = sections.SKILLS.join("\n").split(/[,•|·\n]+/).map(s => s.trim()).filter(s => s.length > 1);
        const uniqueSkills = [...new Set(skillList)];

        data.skillGroups = [{
            id: crypto.randomUUID(),
            name: "Core Competencies",
            skills: uniqueSkills
        }];
        confidence.skills = 'high';
    }

    // Add explicit fallback handlers for arrays to be loaded into text fields on App.jsx side
    if (sections.PROJECTS && sections.PROJECTS.length) {
        data.projects = [{ id: crypto.randomUUID(), name: "Imported Projects", description: sections.PROJECTS.join("\n"), url: "" }];
        confidence.projects = 'low';
    }

    if (sections.CERTIFICATIONS && sections.CERTIFICATIONS.length) {
        data.certifications = [{ id: crypto.randomUUID(), name: "Imported Certifications", issuer: "", date: "", url: "", description: sections.CERTIFICATIONS.join("\n") }];
        confidence.certifications = 'low';
    }

    if (sections.LANGUAGES && sections.LANGUAGES.length) {
        const langList = sections.LANGUAGES.join(",").split(/[,•|·\n]+/).map(s => s.trim()).filter(s => s.length > 1);
        data.Languages = langList.map(l => ({ id: crypto.randomUUID(), language: l, proficiency: "" }));
        confidence.languages = 'high';
    }

    if (sections.ACHIEVEMENTS && sections.ACHIEVEMENTS.length) {
        data.achievements = [{ id: crypto.randomUUID(), title: "Imported Achievements", description: sections.ACHIEVEMENTS.join("\n"), date: "", issuer: "" }];
        confidence.achievements = 'low';
    }

    // Advanced Normalization for Dates
    const dateBoundPattern = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|20\d{2}|19\d{2})\s*(?:-|–|to)\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|20\d{2}|19\d{2}|Present|Current)/i;
    const yearOnlyPattern = /(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(20\d{2}|19\d{2}|Present)/i;

    if (sections.EXPERIENCE && sections.EXPERIENCE.length) {
        let currentExp = null;
        let conf = {};

        sections.EXPERIENCE.forEach((line) => {
            const hasBound = line.match(dateBoundPattern) || line.match(yearOnlyPattern);
            const isTitleOrCompany = line.length > 3 && line.length < 60 && !line.includes('•') && !line.includes('·');

            if (hasBound || (!currentExp && isTitleOrCompany) || (isTitleOrCompany && currentExp && currentExp.description.length > 30)) {
                if (currentExp && (currentExp.title || currentExp.company || currentExp.description)) {
                    data.experience.push(currentExp);
                    confidence.experience.push(conf);
                }
                currentExp = { id: crypto.randomUUID(), title: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" };
                conf = { company: 'low', title: 'low', dates: 'unmapped', desc: 'unmapped' };

                if (hasBound) {
                    const dates = hasBound[0].split(/[–-]|(?:to\s)/i);
                    currentExp.startDate = (dates[0] || "").trim();
                    currentExp.endDate = (dates[1] || "").trim();

                    if (currentExp.endDate.toLowerCase().includes('present') || currentExp.endDate.toLowerCase().includes('current')) {
                        currentExp.current = true;
                        currentExp.endDate = "";
                    }
                    conf.dates = 'high';

                    const textWithoutDate = line.replace(hasBound[0], "").replace(/^[,|-]/, '').trim();
                    if (textWithoutDate) {
                        currentExp.company = textWithoutDate;
                    }
                } else {
                    currentExp.company = line;
                }
            } else if (currentExp) {
                if (!currentExp.company) { currentExp.company = line; conf.company = 'high'; }
                else if (!currentExp.title && line.length < 60 && !line.includes('•')) { currentExp.title = line; conf.title = 'high'; }
                else {
                    currentExp.description += line + "\n";
                    conf.desc = 'high';
                }
            }
        });
        if (currentExp && (currentExp.title || currentExp.company || currentExp.description)) {
            data.experience.push(currentExp);
            confidence.experience.push(conf);
        }
    }

    if (sections.EDUCATION && sections.EDUCATION.length) {
        let currentEdu = null;
        let conf = {};
        const degreeKeywords = /(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D|Bachelor|Master|Doctorate|B\.?Tech|M\.?Tech|Diploma|Certification)/i;
        const uniKeywords = /(University|College|Institute|Academy|School)/i;

        sections.EDUCATION.forEach(line => {
            const hasBound = line.match(dateBoundPattern) || line.match(yearOnlyPattern);
            const isNewBlock = hasBound || line.match(uniKeywords) || line.match(degreeKeywords);

            if (isNewBlock || !currentEdu) {
                if (currentEdu && (currentEdu.institution || currentEdu.degree || currentEdu.description)) {
                    data.education.push(currentEdu);
                    confidence.education.push(conf);
                }
                currentEdu = { id: crypto.randomUUID(), degree: "", fieldOfStudy: "", institution: "", location: "", startDate: "", endDate: "", current: false, description: "" };
                conf = { institution: 'low', degree: 'low' };

                if (hasBound) {
                    const dates = hasBound[0].split(/[–-]|(?:to\s)/i);
                    currentEdu.startDate = (dates[0] || "").trim();
                    currentEdu.endDate = (dates[1] || "").trim();
                }

                let textWithoutDate = hasBound ? line.replace(hasBound[0], "").replace(/,/g, "").trim() : line.trim();

                if (textWithoutDate.match(uniKeywords)) { currentEdu.institution = textWithoutDate; conf.institution = 'high'; }
                else if (textWithoutDate.match(degreeKeywords)) {
                    conf.degree = 'high';
                    if (textWithoutDate.includes(" in ")) {
                        const parts = textWithoutDate.split(" in ");
                        currentEdu.degree = parts[0].trim();
                        currentEdu.fieldOfStudy = parts[1].trim();
                    } else {
                        currentEdu.degree = textWithoutDate;
                    }
                }
                else if (!hasBound && textWithoutDate) {
                    currentEdu.institution = textWithoutDate;
                }
            } else if (currentEdu) {
                if (!currentEdu.degree && line.match(degreeKeywords)) {
                    conf.degree = 'high';
                    if (line.includes(" in ")) {
                        const parts = line.split(" in ");
                        currentEdu.degree = parts[0].trim();
                        currentEdu.fieldOfStudy = parts[1].trim();
                    } else {
                        currentEdu.degree = line;
                    }
                }
                else if (!currentEdu.institution && line.match(uniKeywords)) { currentEdu.institution = line; conf.institution = 'high'; }
                else {
                    currentEdu.description += line + "\n";
                }
            }
        });
        if (currentEdu && (currentEdu.institution || currentEdu.degree || currentEdu.description)) {
            data.education.push(currentEdu);
            confidence.education.push(conf);
        }
    }

    // Dump unmapped lines into unmapped custom area for UI review component
    const unmappedText = (sections.UNMAPPED || []).join("\n").trim();
    if (unmappedText) {
        data.customFields = [{
            id: crypto.randomUUID(),
            title: "Unmapped Recovery",
            description: unmappedText,
            bullets: []
        }];
    }

    return { parsedData: data, confidence, textDump: text };
}
