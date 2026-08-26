import React, { useMemo, useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Search, Wrench, ArrowRight, Filter, FileText, Info } from 'lucide-react';

function stripHtml(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, '');
}

const COMMON_TYPOS = {
    'javascript': 'JavaScript',
    'nodejs': 'Node.js',
    'reactjs': 'React',
    'mysql': 'MySQL',
    'postgresql': 'PostgreSQL',
    'typescript': 'TypeScript',
    'github': 'GitHub',
    'linkedin': 'LinkedIn',
    'frontend': 'Front-end',
    'backend': 'Back-end',
    'jquery': 'jQuery',
    'aws': 'AWS',
    'html5': 'HTML5',
    'css3': 'CSS3'
};

const WEAK_PHRASES = ["responsible for", "duties included", "worked on", "helped with", "tasked with"];

export function analyzeATS(data) {
    let issues = [];

    const add = (severity, cat, section, field, original, problem, why, fixDesc, autoFixFn, fieldId) => {
        issues.push({
            id: Math.random().toString(36).substr(2, 9),
            severity, cat, section, field, original, problem, why, fixDesc, autoFixFn, fieldId
        });
    };

    // 1. CONTACT INFO
    const p = data.personal || {};
    if (!p.fullName?.trim()) {
        add('Critical', 'Contact Information', 'Personal Info', 'Full Name', p.fullName, 'Missing explicit name', 'ATS parsers use this as your primary database ID.', '', null, 'personal');
    } else {
        // Check casing
        if (p.fullName === p.fullName.toLowerCase() || p.fullName === p.fullName.toUpperCase()) {
            add('Warning', 'Consistency', 'Personal Info', 'Full Name', p.fullName, 'Non-standard capitalization', 'Proper Title Case appears more professional to parsers.', 'Format as Title Case', (d) => ({ personal: { ...d.personal, fullName: d.personal.fullName.replace(/\\w\\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()) } }), 'personal');
        }
    }

    if (!p.email || !p.email.includes('@')) {
        add('Critical', 'Contact Information', 'Personal Info', 'Email', p.email, 'Invalid email structure', 'Necessary for automated recruiting communications.', '', null, 'personal');
    } else if (p.email !== p.email.toLowerCase()) {
        add('Suggestion', 'Consistency', 'Personal Info', 'Email', p.email, 'Uppercase letters in email', 'Standardizes to lowercase cleanly.', 'Convert to lowercase', (d) => ({ personal: { ...d.personal, email: d.personal.email.toLowerCase() } }), 'personal');
    }

    if (!p.phone || !p.phone.number || p.phone.number.trim().length < 6) {
        add('Warning', 'Contact Information', 'Personal Info', 'Phone', p.phone?.number, 'Missing phone number', 'Phones are normally scheduled via direct number.', '', null, 'personal');
    }

    // 2. SUMMARY (Spelling, Grammar, Spaces)
    if (data.summary) {
        const rawSum = stripHtml(data.summary);
        if (rawSum.length > 0 && rawSum.length < 100) {
            add('Suggestion', 'Content Quality', 'Summary', 'Summary', rawSum.substring(0, 30) + '...', 'Summary too short', 'A robust summary improves parser keyword density vastly.', 'Expand summary detail', null, 'summary');
        }

        // Check extra spaces
        if (/\\s{2,}/.test(rawSum)) {
            add('Warning', 'Formatting', 'Summary', 'Summary Text', '(Multiple spaces detected)', 'Excessive internal spacing', 'Breaks visual flow and layout bounds.', 'Normalize spacing', (d) => ({ summary: (d.summary || "").replace(/\\s{2,}/g, ' ') }), 'summary');
        }

        // Check duplicate words (e.g. "the the")
        const match = rawSum.match(/\\b(\\w+)\\s+\\1\\b/i);
        if (match) {
            add('Warning', 'Spelling & Grammar', 'Summary', 'Summary Text', match[0], 'Duplicated word', 'Grammatical error visually lowers polish score.', `Remove duplicate '${match[1]}'`, (d) => {
                const stripRe = new RegExp(`\\\\b${match[1]}\\\\s+${match[1]}\\\\b`, 'ig');
                return { summary: (d.summary || "").replace(stripRe, match[1]) };
            }, 'summary');
        }

        // Check weak phrasing
        WEAK_PHRASES.forEach(phrase => {
            if (rawSum.toLowerCase().includes(phrase)) {
                add('Suggestion', 'Writing Style', 'Summary', 'Text', phrase, 'Weak terminology', 'Action verbs yield drastically higher screening metrics.', 'Use strong action verb', null, 'summary');
            }
        });
    } else {
        add('Warning', 'Completeness', 'Summary', 'Section', '', 'Missing professional summary', 'Many ATS systems rank summaries heavily in semantic matches.', '', null, 'summary');
    }

    // 3. EXPERIENCE
    const exps = data.experience || [];
    if (exps.length === 0) {
        add('Critical', 'Completeness', 'Experience', 'History', '', 'No work experience listed', 'Universally the most weighted ATS indexing metric.', '', null, 'experience');
    } else {
        exps.forEach((e, i) => {
            if (!e.jobTitle && !e.company) {
                add('Critical', 'Structure', 'Experience', `Entry #${i + 1}`, 'Empty Record', 'Blank experience entries detected', 'Empty ghost blocks crash parsing scraping models.', 'Remove empty entry', (d) => ({ experience: d.experience.filter((_, idx) => idx !== i) }), 'experience');
            } else {
                const rawDesc = stripHtml(e.summary || "");
                if (rawDesc.trim().length < 20) {
                    add('Warning', 'Content Quality', 'Experience', e.company || 'Company', rawDesc, 'Brief descriptions', 'Lacking semantic context deprives keyword scraping.', 'Expand bullet points', null, 'experience');
                } else if (!/\\d|%|\\$|revenue|users/.test(rawDesc.toLowerCase())) {
                    add('Warning', 'Experience Quality', 'Experience', e.company || 'Company', '(No numbers found)', 'Missing measurable metrics', 'Numbers (percentages, impact) massively boost semantic scoring.', 'Add quantitative data', null, 'experience');
                }

                // Weak phrases
                WEAK_PHRASES.forEach(phrase => {
                    if (rawDesc.toLowerCase().includes(phrase)) {
                        add('Suggestion', 'Writing Style', 'Experience', e.company, phrase, 'Passive language detected', 'Action-oriented language bypasses human screening faster.', 'Revise with strong verb', null, 'experience');
                    }
                });

                // Capitalization inconsistencies
                if (e.jobTitle && e.jobTitle === e.jobTitle.toLowerCase() && e.jobTitle.length > 2) {
                    add('Suggestion', 'Consistency', 'Experience', 'Job Title', e.jobTitle, 'Lowercase job title', 'Job titles should follow standard Title Case mapping.', 'Capitalize title', (d) => ({ experience: d.experience.map((ex, idx) => idx === i ? { ...ex, jobTitle: ex.jobTitle.replace(/\\w\\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()) } : ex) }), 'experience');
                }
            }
        });
    }

    // 4. EDUCATION
    const edus = data.education || [];
    if (edus.length > 0) {
        edus.forEach((e, i) => {
            if (!e.institution && !e.degree) {
                add('Warning', 'Structure', 'Education', `Entry #${i + 1}`, 'Empty record', 'Blank education row', 'Orphan elements waste parsing boundaries.', 'Remove blank record', (d) => ({ education: d.education.filter((_, idx) => idx !== i) }), 'education');
            }
        });
    } else {
        add('Warning', 'Completeness', 'Education', 'Section', '', 'No education listed', 'Degree metadata is often a mandatory fallback field.', '', null, 'education');
    }

    // 5. SKILLS
    const groups = data.skillGroups || [];
    let totalSkills = 0;
    groups.forEach((g, gIdx) => {
        let seenSkills = new Set();
        const skills = g.skills || [];
        totalSkills += skills.length;

        skills.forEach((s, sIdx) => {
            const raw = (s.name || "").trim();
            if (!raw) return;

            // Duplicates
            const lower = raw.toLowerCase();
            if (seenSkills.has(lower)) {
                add('Warning', 'Skills & Keywords', 'Skills', g.groupName || 'Group', raw, 'Duplicate skill mapping', 'Duplicates dilute keyword ranking mechanisms.', 'Remove duplicate', (d) => {
                    const newGroups = [...d.skillGroups];
                    newGroups[gIdx].skills = newGroups[gIdx].skills.filter((_, j) => j !== sIdx);
                    return { skillGroups: newGroups };
                }, 'skills');
            }
            seenSkills.add(lower);

            // Spelling
            if (COMMON_TYPOS[lower] && raw !== COMMON_TYPOS[lower]) {
                add('Suggestion', 'Consistency', 'Skills', 'Skill String', raw, `${raw} violates standardized terminology`, 'ATS matches exactly against known keyword registries.', `Standardize as ${COMMON_TYPOS[lower]}`, (d) => {
                    const newGroups = [...d.skillGroups];
                    const newSkills = [...newGroups[gIdx].skills];
                    newSkills[sIdx] = { ...newSkills[sIdx], name: COMMON_TYPOS[lower] };
                    newGroups[gIdx].skills = newSkills;
                    return { skillGroups: newGroups };
                }, 'skills');
            }
        });
    });

    if (totalSkills < 6) {
        add(totalSkills === 0 ? 'Critical' : 'Warning', 'Skills & Keywords', 'Skills', 'Array', `${totalSkills} total skills`, 'Vulnerable skill density', 'Lack of explicit keyword mappings creates automated rejection risks.', '', null, 'skills');
    }

    // Generate deterministic score from deductions
    // Base 100
    let deductions = 0;
    issues.forEach(i => {
        if (i.severity === 'Critical') deductions += 15;
        else if (i.severity === 'Warning') deductions += 5;
        else deductions += 2;
    });

    const score = Math.max(0, 100 - deductions);

    return {
        score,
        issues
    };
}

export function ATSCheckerModal({ data, update, onClose, onGoToField }) {
    const result = useMemo(() => analyzeATS(data), [data]);
    const [filter, setFilter] = useState('All'); // All, Critical, Warnings, Suggestions, Auto-Fixable

    const handleAutoFix = (issue) => {
        if (issue.autoFixFn) update(issue.autoFixFn(data));
    };

    const handleFixAll = () => {
        let currentData = { ...data };
        result.issues.forEach(iss => {
            if (iss.autoFixFn) {
                currentData = { ...currentData, ...iss.autoFixFn(currentData) };
            }
        });
        update(currentData);
    };

    const displayedIssues = result.issues.filter(iss => {
        if (filter === 'All') return true;
        if (filter === 'Critical') return iss.severity === 'Critical';
        if (filter === 'Warnings') return iss.severity === 'Warning';
        if (filter === 'Suggestions') return iss.severity === 'Suggestion';
        if (filter === 'Auto-Fixable') return !!iss.autoFixFn;
        return true;
    });

    const getStatusColor = (score) => {
        if (score >= 90) return "text-teal-600";
        if (score >= 70) return "text-blue-600";
        if (score >= 50) return "text-orange-500";
        return "text-red-600";
    };

    const getSeverityBadge = (s) => {
        if (s === 'Critical') return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest border border-red-200"><XCircle size={12} /> Critical</span>;
        if (s === 'Warning') return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest border border-orange-200"><AlertTriangle size={12} /> Warning</span>;
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-200"><Info size={12} /> Suggestion</span>;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8">
            <div className="w-full max-w-6xl bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col h-full max-h-[90vh] overflow-hidden border border-slate-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-800 text-white shrink-0 shadow-sm z-10">
                    <h2 className="text-sm font-bold flex items-center gap-2 tracking-wide">
                        <Search size={16} className="text-teal-400" /> ATS ANALYSIS CONSOLE
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col sm:flex-row bg-slate-50">
                    {/* Left Panel: Score */}
                    <div className="w-full sm:w-[28%] bg-white border-r border-slate-200 p-6 flex flex-col shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                        <div className="flex flex-col items-center pt-4 mb-8">
                            <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-[12px] border-slate-100 shadow-inner">
                                <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" style={{ left: '-12px', top: '-12px', width: 'calc(100% + 24px)', height: 'calc(100% + 24px)' }}>
                                    <circle cx="80" cy="80" r="74" fill="transparent" stroke="currentColor" strokeWidth="12" className={getStatusColor(result.score)} strokeDasharray={465} strokeDashoffset={465 - (465 * result.score) / 100} strokeLinecap="round" />
                                </svg>
                                <div className="flex flex-col items-center">
                                    <span className={`text-[46px] font-black leading-none ${getStatusColor(result.score)}`}>{result.score}</span>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">/ 100</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Diagnostics Tree</h3>
                            <div className="text-[13px] font-mono text-slate-600 space-y-1.5">
                                <div className="flex justify-between"><span>Total Found</span><span className="font-bold text-slate-800">{result.issues.length}</span></div>
                                <div className="flex justify-between pl-3 border-l-2 border-red-200"><span>Critical</span><span className="font-bold text-slate-800">{result.issues.filter(i => i.severity === 'Critical').length}</span></div>
                                <div className="flex justify-between pl-3 border-l-2 border-orange-200"><span>Warnings</span><span className="font-bold text-slate-800">{result.issues.filter(i => i.severity === 'Warning').length}</span></div>
                                <div className="flex justify-between pl-3 border-l-2 border-blue-200"><span>Suggestions</span><span className="font-bold text-slate-800">{result.issues.filter(i => i.severity === 'Suggestion').length}</span></div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-200 text-[13px] font-mono text-slate-600 space-y-1.5">
                                <div className="flex justify-between bg-teal-50 text-teal-800 px-2 py-1 rounded"><span>Safe Fixes Available</span><span className="font-bold">{result.issues.filter(i => i.autoFixFn).length}</span></div>
                                <div className="flex justify-between px-2 py-1"><span>Manual Interaction</span><span className="font-bold">{result.issues.length - result.issues.filter(i => i.autoFixFn).length}</span></div>
                            </div>
                        </div>

                        {result.issues.filter(i => i.autoFixFn).length > 0 && (
                            <button onClick={handleFixAll} className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white text-sm font-bold py-3 rounded-lg hover:bg-teal-700 shadow-md transition-all active:scale-[0.98]">
                                <Wrench size={16} /> Fix All Safe Issues
                            </button>
                        )}
                    </div>

                    {/* Right Panel: Data Matrix */}
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">

                        {/* Sticky Toolbar */}
                        <div className="flex items-center gap-2 p-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
                            <span className="text-slate-400 mr-2"><Filter size={16} /></span>
                            {['All', 'Critical', 'Warnings', 'Suggestions', 'Auto-Fixable'].map(f => (
                                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Issue Stream */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {displayedIssues.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                                    <CheckCircle size={64} className="text-teal-400/50 mb-6" />
                                    <h4 className="text-xl font-bold text-slate-600 mb-2">Matrix Clean</h4>
                                    <p className="text-sm text-slate-500 text-center max-w-sm">No structural or linguistic anomalies detected in the current filter scope.</p>
                                </div>
                            ) : (
                                displayedIssues.map(iss => (
                                    <div key={iss.id} className="bg-white border text-sm border-slate-200 hover:border-slate-300 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden">

                                        {/* Context Path Band */}
                                        <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center gap-2 uppercase">
                                            {iss.cat} <ArrowRight size={10} /> {iss.section} <ArrowRight size={10} /> {iss.field}
                                        </div>

                                        <div className="p-4 sm:p-5 flex flex-col gap-4">
                                            <div className="flex items-start justify-between gap-5">
                                                <div className="flex-1">
                                                    <div className="mb-3">
                                                        {getSeverityBadge(iss.severity)}
                                                    </div>
                                                    <h4 className="text-[15px] font-bold text-slate-800 mb-1.5 leading-snug">{iss.problem}</h4>
                                                    <p className="text-slate-500 text-[13px] leading-relaxed mb-4 max-w-2xl">{iss.why}</p>

                                                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[12px] font-mono max-w-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-slate-400 font-bold uppercase tracking-widest">Original Value:</span>
                                                            <span className="text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 truncate" title={iss.original || '(Empty)'}>{iss.original || '(Empty)'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className="text-slate-400 font-bold uppercase tracking-widest">Requested Fix:</span>
                                                            <span className="text-blue-700 font-semibold">{iss.fixDesc || 'Manual verification mandated.'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 shrink-0 self-start">
                                                    {iss.autoFixFn ? (
                                                        <button onClick={() => handleAutoFix(iss)} className="w-[140px] inline-flex items-center justify-center gap-2 text-xs font-bold bg-slate-800 text-white px-4 py-2.5 rounded-md hover:bg-slate-900 transition-colors shadow-sm">
                                                            <Wrench size={14} /> [Auto Fix]
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => onGoToField(iss.fieldId)} className="w-[140px] inline-flex items-center justify-center gap-2 text-xs font-bold bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-md hover:bg-slate-50 transition-all shadow-sm group-hover:border-slate-400">
                                                            <FileText size={14} /> [Review & Edit]
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
