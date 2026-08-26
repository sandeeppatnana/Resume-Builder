import React from 'react';
import {
    pageStyle,
    sectionOrderStyle,
    CustomFieldSection,
    ContactLine,
    ContactStack,
    ContactLink,
    normalizeToHtml,
    customSectionKey
} from './App';

function hrefFor(kind, value) {
    if (!value) return "#";
    if (kind === "email") return `mailto:${value.trim()}`;
    if (kind === "phone") return `tel:${value.replace(/\s/g, "")}`;
    if (kind === "url") {
        let url = value.trim();
        if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
        return url;
    }
    return "#";
}

function displayUrl(url) {
    if (!url) return "";
    return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function UniversalTemplate({ data, pageSettings, config }) {
    const { personal: p, summary } = data;
    const sections = data.sectionOrder.map(key => {
        if (key === 'summary' && summary) return { key, title: 'Summary', renderer: renderSummary };
        if (key === 'experience' && data.experience?.length) return { key, title: 'Experience', renderer: renderExperience };
        if (key === 'education' && data.education?.length) return { key, title: 'Education', renderer: renderEducation };
        if (key === 'projects' && data.projects?.length) return { key, title: 'Projects', renderer: renderProjects };
        if (key === 'skills' && data.skillGroups?.length) return { key, title: 'Skills', renderer: renderSkills };
        if (key === 'certifications' && data.certifications?.length) return { key, title: 'Certifications', renderer: renderCertifications };
        if (key === 'achievements' && data.achievements?.length) return { key, title: 'Achievements', renderer: renderAchievements };
        if (key === 'Languages' && data.Languages?.length) return { key, title: 'Languages', renderer: renderLanguages };
        if (key === 'links' && data.links?.length) return { key, title: 'Links', renderer: renderLinks };
        if (key === 'internships' && data.internships?.length) return { key, title: 'Internships', renderer: renderInternships };
        if (key === 'courses' && data.courses?.length) return { key, title: 'Courses', renderer: renderCourses };
        if (key === 'volunteering' && data.volunteering?.length) return { key, title: 'Volunteering', renderer: renderVolunteering };
        if (key === 'publications' && data.publications?.length) return { key, title: 'Publications', renderer: renderPublications };
        if (key === 'interests' && data.interests?.length) return { key, title: 'Interests', renderer: renderInterests };

        if (key === 'customSection' && data.customSection?.items?.length) return { key, title: data.customSection.sectionTitle || 'Custom Section', renderer: renderCustomSection };

        const field = data.customFields?.find(f => customSectionKey(f.id) === key);
        if (field && (field.description || field.bullets?.length)) return { key, title: field.title, renderer: () => <CustomFieldSection field={field} style={sectionOrderStyle(data, key)} variant={config.customFieldVariant || "ats"} /> };

        return null;
    }).filter(Boolean);

    function Section({ title, children, keyName }) {
        if (!title) return <div className={`mb-${config.spacing.sectionBottom} `} style={sectionOrderStyle(data, keyName)}>{children}</div>;
        return (
            <div className={`mb-${config.spacing.sectionBottom} `} style={sectionOrderStyle(data, keyName)}>
                <h2 className={config.styles.heading}>{title}</h2>
                <div className={config.styles.sectionBody}>{children}</div>
            </div>
        );
    }

    function renderSummary() {
        return <div className={`${config.styles.text} resume-richtext`} dangerouslySetInnerHTML={{ __html: normalizeToHtml(summary) }} />;
    }

    function renderExperience() {
        return data.experience.map((e) => (
            <div key={e.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{e.jobTitle}</span>
                    <span className={config.styles.date}>{e.startDate}{(e.startDate || e.endDate || e.current) && " \u2013 "}{e.current ? "Present" : e.endDate}</span>
                </div>
                <div className={config.styles.itemSubHeader}>
                    <span>{e.company}</span>
                    <span>{e.location}</span>
                </div>
                {(e.summary || e.responsibilities?.filter(Boolean).length > 0) && (
                    <div className={`${config.styles.text} mt-${config.spacing.bodyTop} resume-richtext`} dangerouslySetInnerHTML={{ __html: e.summary?.includes('<') ? normalizeToHtml(e.summary) : normalizeToHtml(e.summary) + normalizeToHtml(e.responsibilities) }} />
                )}
            </div>
        ));
    }

    function renderEducation() {
        return data.education.map((ed) => (
            <div key={ed.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{[ed.degree, ed.fieldOfStudy].filter(Boolean).join(" in ")}</span>
                    <span className={config.styles.date}>{ed.startDate}{(ed.startDate || ed.endDate) && " \u2013 "}{ed.endDate}</span>
                </div>
                <div className={config.styles.itemSubHeader}>
                    <span>{ed.institution}{ed.location && `, ${ed.location}`}{ed.grade && ` \u2014 ${ed.grade}`}</span>
                </div>
                {ed.description && (
                    <div className={`${config.styles.text} mt-${config.spacing.bodyTop} resume-richtext`} dangerouslySetInnerHTML={{ __html: normalizeToHtml(ed.description) }} />
                )}
            </div>
        ));
    }

    function renderProjects() {
        return data.projects.map((pr) => (
            <div key={pr.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{pr.name}</span>
                </div>
                {(pr.description || pr.highlights?.filter(Boolean).length > 0) && (
                    <div className={`${config.styles.text} mt-${config.spacing.bodyTop} resume-richtext`} dangerouslySetInnerHTML={{ __html: pr.description?.includes('<') ? normalizeToHtml(pr.description) : normalizeToHtml(pr.description) + normalizeToHtml(pr.highlights) }} />
                )}
                {pr.tools && <p className={`${config.styles.text} italic mt-1`}>Tools: {pr.tools}</p>}
            </div>
        ));
    }

    function renderSkills() {
        return data.skillGroups.map((g) => (
            <p key={g.id} className={`${config.styles.text} mb-${config.spacing.itemBottom} `}>
                <span className={config.styles.skillGroup}>{g.name}: </span>
                {g.skills.join(", ")}
            </p>
        ));
    }

    function renderCertifications() {
        return data.certifications.map((c) => (
            <div key={c.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{c.name}</span>
                    <span className={config.styles.date}>{c.issueDate}</span>
                </div>
                <div className={config.styles.itemSubHeader}>
                    <span>{c.organization}</span>
                </div>
            </div>
        ));
    }

    function renderAchievements() {
        return data.achievements.map((a) => (
            <div key={a.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{a.title}</span>
                    <span className={config.styles.date}>{a.date}</span>
                </div>
                <div className={config.styles.itemSubHeader}>
                    <span>{a.organization}</span>
                </div>
                {a.description && <div className={`${config.styles.text} mt-${config.spacing.bodyTop} resume-richtext`} dangerouslySetInnerHTML={{ __html: normalizeToHtml(a.description) }} />}
            </div>
        ));
    }

    function renderLanguages() {
        return (
            <div className="flex flex-wrap gap-4">
                {data.Languages.map((l) => (
                    <div key={l.id} className={`${config.styles.text} `}>
                        <span className="font-semibold">{l.name}</span>: {l.proficiency}
                    </div>
                ))}
            </div>
        );
    }

    function renderLinks() {
        return (
            <div className="flex flex-wrap gap-4">
                {data.links.map((l) => (
                    <div key={l.id} className={`${config.styles.text} `}>
                        <span className="font-semibold">{l.platform}: </span>
                        <ContactLink href={hrefFor("url", l.url)} className="break-all">{displayUrl(l.url)}</ContactLink>
                    </div>
                ))}
            </div>
        );
    }

    function renderInternships() {
        return data.internships.map((e) => (
            <div key={e.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{e.jobTitle}</span>
                    <span className={config.styles.date}>{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
                </div>
                <div className={config.styles.itemSubHeader}>
                    <span>{e.company}</span>
                    <span>{e.location}</span>
                </div>
                {e.description && <div className={`${config.styles.text} mt-${config.spacing.bodyTop} resume-richtext`} dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.description) }} />}
            </div>
        ));
    }

    function renderCourses() {
        return data.courses.map((c) => (
            <div key={c.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{c.name}</span>
                </div>
                <div className={config.styles.itemSubHeader}>
                    <span>{c.institution}</span>
                </div>
            </div>
        ));
    }

    function renderVolunteering() {
        return data.volunteering.map((v) => (
            <div key={v.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{v.role}</span>
                    <span className={config.styles.date}>{v.startDate}{(v.startDate || v.endDate) && " \u2013 "}{v.endDate}</span>
                </div>
                <div className={config.styles.itemSubHeader}>
                    <span>{v.organization}</span>
                </div>
                {v.description && <div className={`${config.styles.text} mt-${config.spacing.bodyTop} resume-richtext`} dangerouslySetInnerHTML={{ __html: normalizeToHtml(v.description) }} />}
            </div>
        ));
    }

    function renderPublications() {
        return data.publications.map((p) => (
            <div key={p.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{p.title}</span>
                    <span className={config.styles.date}>{p.date}</span>
                </div>
                <div className={config.styles.itemSubHeader}>
                    <span>{p.publisher}</span>
                </div>
                {p.url && <div className={`${config.styles.text} mt-0.5`}><ContactLink href={hrefFor("url", p.url)} className="break-all">{displayUrl(p.url)}</ContactLink></div>}
            </div>
        ));
    }

    function renderInterests() {
        return (
            <div className={`${config.styles.text}`}>
                {data.interests.map(i => i.name).filter(Boolean).join(", ")}
            </div>
        );
    }

    function renderCustomSection() {
        return data.customSection.items.map((i) => (
            <div key={i.id} className={`mb-${config.spacing.itemBottom} last:mb-0 `}>
                <div className={config.styles.itemHeader}>
                    <span className={config.styles.jobTitle}>{i.title}</span>
                    <span className={config.styles.date}>{i.subtitle}</span>
                </div>
                {(i.description || i.bullets?.filter(Boolean).length > 0) && (
                    <div className={`${config.styles.text} mt-${config.spacing.bodyTop} resume-richtext`} dangerouslySetInnerHTML={{ __html: i.description?.includes('<') ? normalizeToHtml(i.description) : normalizeToHtml(i.description) + normalizeToHtml(i.bullets) }} />
                )}
            </div>
        ));
    }

    return (
        <>
            <style type="text/css">{`
 @media print {
 @page { margin: ${config.padding} !important; }
 #resume-print-page { padding: 0 !important; width: 100% !important; min-height: auto !important; }
 }
 `}</style>
            <div id="resume-print-page" className={`bg-white ${config.styles.font} flex flex-col`} style={{ ...pageStyle(pageSettings), padding: config.padding }}>
                {config.layout === 'two-column-left' ? (
                    <>
                        <div className={`flex items-center gap-4 mb-4 ${config.styles.headerWrapper}`}>
                            <div className="flex-auto min-w-[40%] max-w-full">
                                <h1 className={`${config.styles.name} break-words`}>{p.fullName}</h1>
                                {p.title && <p className={`${config.styles.title} break-words`}>{p.title}</p>}
                            </div>
                            <ContactStack p={p} className={`shrink min-w-[30%] ${config.styles.contactArea || ''}`} />
                        </div>
                        <hr className={config.styles.divider} />
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 mt-4">
                            <div className="flex flex-col">
                                {sections.filter(s => ['skills', 'education', 'certifications', 'Languages', 'links'].includes(s.key)).map(s => (
                                    <Section key={s.key} title={s.title} keyName={s.key}>{s.renderer()}</Section>
                                ))}
                            </div>
                            <div className="flex flex-col">
                                {sections.filter(s => !['skills', 'education', 'certifications', 'Languages', 'links'].includes(s.key)).map(s => (
                                    <Section key={s.key} title={s.title} keyName={s.key}>{s.renderer()}</Section>
                                ))}
                            </div>
                        </div>
                    </>
                ) : config.layout === 'two-column-right' ? (
                    <>
                        <div className={`text-center mb-4 ${config.styles.headerWrapper}`}>
                            <div className="w-full min-w-[40%] max-w-full">
                                <h1 className={`${config.styles.name} break-words`}>{p.fullName}</h1>
                                {p.title && <p className={`${config.styles.title} break-words`}>{p.title}</p>}
                            </div>
                            <ContactLine p={p} className={`mt-2 ${config.styles.text} justify-center w-full shrink flex-wrap`} />
                        </div>
                        <hr className={config.styles.divider} />
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6 mt-4">
                            <div className="flex flex-col">
                                {sections.filter(s => !['skills', 'certifications', 'Languages', 'links', 'interests'].includes(s.key)).map(s => (
                                    <Section key={s.key} title={s.title} keyName={s.key}>{s.renderer()}</Section>
                                ))}
                            </div>
                            <div className="flex flex-col">
                                {sections.filter(s => ['skills', 'certifications', 'Languages', 'links', 'interests'].includes(s.key)).map(s => (
                                    <Section key={s.key} title={s.title} keyName={s.key}>{s.renderer()}</Section>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={`${config.styles.headerWrapper}`}>
                            <div className="flex-auto min-w-[40%] max-w-full">
                                <h1 className={`${config.styles.name} break-words`}>{p.fullName}</h1>
                                {p.title && <p className={`${config.styles.title} break-words`}>{p.title}</p>}
                            </div>
                            {config.styles.contactLayout === 'stack' ? (
                                <ContactStack p={p} className={`mt-2 shrink ${config.styles.contactArea || ''}`} />
                            ) : (
                                <ContactLine p={p} className={`mt-1.5 shrink flex-wrap ${config.styles.contactArea || ''} ${config.styles.text}`} />
                            )}
                        </div>
                        {config.styles.divider && <hr className={config.styles.divider} />}
                        {sections.map(s => (
                            <Section key={s.key} title={s.title} keyName={s.key}>{s.renderer()}</Section>
                        ))}
                    </>
                )}
            </div>
        </>
    );
}

// ------ CONFIGURATIONS ------

const ATS_PRO_CONFIG = {
    layout: 'single',
    padding: "16mm 18mm",
    spacing: { sectionBottom: 4, itemBottom: 3, bodyTop: 1 },
    styles: {
        font: 'font-serif text-slate-900',
        headerWrapper: 'text-center mb-4',
        contactArea: 'justify-center text-center',
        name: 'text-[24px] font-bold tracking-tight',
        title: 'text-[13px] mt-1',
        text: 'text-[11.5px] leading-relaxed',
        divider: 'my-3 border-slate-400',
        heading: 'text-[13px] font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-2.5 break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11.5px] italic mt-0.5',
        jobTitle: 'text-[13px] font-bold',
        date: 'text-[11.5px]',
        skillGroup: 'font-bold',
        sectionBody: ''
    }
};

const MODERN_PRO_CONFIG = {
    layout: 'single',
    padding: "16mm 18mm",
    spacing: { sectionBottom: 5, itemBottom: 3, bodyTop: 1 },
    styles: {
        font: 'font-sans text-slate-800',
        headerWrapper: 'flex flex-wrap justify-between items-end gap-x-4 gap-y-2 mb-4',
        contactArea: 'justify-end text-right',
        name: 'text-[28px] font-extrabold tracking-tight text-blue-900',
        title: 'text-[14px] font-medium text-blue-700 mt-1',
        text: 'text-[11.5px] leading-relaxed',
        divider: 'my-3 border-blue-900 border-t-2',
        heading: 'text-[12px] font-bold uppercase tracking-widest text-blue-900 mb-2 break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11.5px] font-medium text-slate-600',
        jobTitle: 'text-[13px] font-bold text-slate-900',
        date: 'text-[11.5px] text-blue-800 font-medium',
        skillGroup: 'font-bold text-slate-900',
        sectionBody: 'border-l-2 border-slate-200 pl-3 ml-1'
    }
};

const EXECUTIVE_CONFIG = {
    layout: 'single',
    padding: "20mm 20mm",
    spacing: { sectionBottom: 5, itemBottom: 4, bodyTop: 1.5 },
    styles: {
        font: 'font-serif text-slate-900',
        headerWrapper: 'text-center mb-5',
        contactArea: 'justify-center text-center',
        name: 'text-[26px] font-normal tracking-wide uppercase',
        title: 'text-[12px] uppercase tracking-[0.2em] text-slate-500 mt-2',
        text: 'text-[11px] leading-loose',
        divider: 'my-4 border-slate-300',
        heading: 'text-[11px] font-bold uppercase tracking-[0.15em] text-slate-800 text-center mb-4 break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11px] italic text-slate-600',
        jobTitle: 'text-[12px] font-bold uppercase tracking-wide',
        date: 'text-[11px] font-medium',
        skillGroup: 'font-bold uppercase tracking-wider text-[10px]',
        sectionBody: ''
    }
};

const CORPORATE_CONFIG = {
    layout: 'single',
    padding: "16mm 18mm",
    spacing: { sectionBottom: 4, itemBottom: 3, bodyTop: 1 },
    styles: {
        font: 'font-sans text-slate-800',
        headerWrapper: 'text-left mb-6',
        name: 'text-[24px] font-bold text-slate-900',
        title: 'text-[13px] font-semibold text-slate-600 mt-1',
        contactLayout: 'stack',
        contactArea: 'mt-3 grid grid-cols-2 gap-x-4 gap-y-1',
        text: 'text-[11px] leading-relaxed',
        divider: '',
        heading: 'text-[12px] font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-1 mb-3 break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11px] text-slate-600',
        jobTitle: 'text-[12px] font-bold',
        date: 'text-[11px] font-medium px-2 py-0.5 bg-slate-50 rounded text-slate-600',
        skillGroup: 'font-bold',
        sectionBody: ''
    }
};

const TECH_CONFIG = {
    layout: 'single',
    padding: "14mm 16mm",
    spacing: { sectionBottom: 4, itemBottom: 2, bodyTop: 0.5 },
    styles: {
        font: 'font-sans text-slate-800',
        headerWrapper: 'text-left mb-4 flex flex-col items-start',
        contactArea: 'justify-start text-left',
        name: 'text-[22px] font-black tracking-tighter text-slate-900',
        title: 'text-[13px] font-mono text-emerald-600 mt-1',
        text: 'text-[11px] leading-snug',
        divider: 'my-3 border-slate-200 border-dashed',
        heading: 'text-[14px] font-black tracking-tight text-slate-900 mb-2 border-b-2 border-emerald-500 inline-block break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11px] text-slate-500 font-mono mt-0.5',
        jobTitle: 'text-[12.5px] font-bold',
        date: 'text-[10.5px] font-mono text-slate-400',
        skillGroup: 'font-bold text-emerald-700',
        sectionBody: ''
    }
};

const CONSULTING_CONFIG = {
    layout: 'single',
    padding: "18mm 20mm",
    spacing: { sectionBottom: 4, itemBottom: 3, bodyTop: 1 },
    styles: {
        font: 'font-serif text-slate-900',
        headerWrapper: 'text-center mb-5',
        contactArea: 'justify-center text-center',
        name: 'text-[24px] font-bold',
        title: 'text-[12px] italic mt-1',
        text: 'text-[11px] leading-relaxed',
        divider: 'my-3 border-black border-t-2',
        heading: 'text-[11.5px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-2 break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11px] mt-0.5',
        jobTitle: 'text-[12px] font-bold',
        date: 'text-[11px]',
        skillGroup: 'font-bold italic',
        sectionBody: ''
    }
};

const PM_CONFIG = {
    layout: 'single',
    padding: "16mm 18mm",
    spacing: { sectionBottom: 5, itemBottom: 4, bodyTop: 1.5 },
    styles: {
        font: 'font-sans text-slate-800',
        headerWrapper: 'text-center mb-4',
        contactArea: 'justify-center text-center',
        name: 'text-[24px] font-bold tracking-tight',
        title: 'text-[13px] font-semibold text-teal-700 mt-1',
        text: 'text-[11.5px] leading-relaxed',
        divider: 'my-3 border-teal-200',
        heading: 'text-[13px] font-bold uppercase tracking-wide text-teal-800 flex items-center gap-2 mb-3 before:content-[""] before:w-3 before:h-3 before:bg-teal-600 before:rounded-sm break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11.5px] text-slate-500 font-medium',
        jobTitle: 'text-[13px] font-bold text-slate-900',
        date: 'text-[11.5px] font-bold text-teal-700',
        skillGroup: 'font-bold text-slate-900',
        sectionBody: ''
    }
};

const COMPACT_CONFIG = {
    layout: 'single',
    padding: "10mm 12mm",
    spacing: { sectionBottom: 2, itemBottom: 1, bodyTop: 0.5 },
    styles: {
        font: 'font-sans text-slate-900',
        headerWrapper: 'flex justify-between items-center mb-2',
        name: 'text-[18px] font-bold tracking-tight',
        title: 'text-[11px] font-medium text-slate-600',
        text: 'text-[10px] leading-tight',
        divider: 'my-2 border-slate-300',
        heading: 'text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-700 break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[10px] italic',
        jobTitle: 'text-[11px] font-bold',
        date: 'text-[10px]',
        skillGroup: 'font-bold',
        sectionBody: ''
    }
};

const TWO_COLUMN_CONFIG = {
    layout: 'two-column-left',
    padding: "16mm 18mm",
    spacing: { sectionBottom: 4, itemBottom: 3, bodyTop: 1 },
    styles: {
        font: 'font-sans text-slate-800',
        headerWrapper: 'mb-4',
        name: 'text-[32px] font-extrabold tracking-tight',
        title: 'text-[14px] font-medium text-slate-500 mt-1',
        contactLayout: 'stack',
        contactArea: 'gap-y-1',
        text: 'text-[11px] leading-relaxed',
        divider: 'my-4 border-slate-200',
        heading: 'text-[12px] font-black uppercase tracking-wider text-slate-900 mb-2 border-b-2 border-slate-900 pb-1 inline-block break-after-avoid',
        itemHeader: 'flex flex-col mb-0.5 break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11px] text-slate-500 font-medium',
        jobTitle: 'text-[13px] font-bold text-slate-900',
        date: 'text-[11px] font-bold text-slate-400 mt-0.5',
        skillGroup: 'font-bold block mb-0.5 text-slate-900',
        sectionBody: ''
    }
};

const ACADEMIC_CONFIG = {
    layout: 'two-column-right',
    padding: "18mm 20mm",
    spacing: { sectionBottom: 5, itemBottom: 3, bodyTop: 1 },
    styles: {
        font: 'font-serif text-slate-900',
        headerWrapper: 'mb-6 text-center',
        contactArea: 'justify-center text-center',
        name: 'text-[24px] font-bold',
        title: 'text-[13px] mt-1',
        text: 'text-[11px] leading-relaxed',
        divider: 'my-4 border-black border-t-2',
        heading: 'text-[12px] font-bold uppercase tracking-widest text-black mb-3 border-b border-black pb-1 break-after-avoid',
        itemHeader: 'flex justify-between items-baseline break-after-avoid',
        itemSubHeader: 'flex justify-between items-baseline text-[11px] italic mt-0.5',
        jobTitle: 'text-[12px] font-bold',
        date: 'text-[11px]',
        skillGroup: 'font-bold block',
        sectionBody: ''
    }
};

export function ResumeATSPro(props) { return <UniversalTemplate {...props} config={ATS_PRO_CONFIG} />; }
export function ResumeModernPro(props) { return <UniversalTemplate {...props} config={MODERN_PRO_CONFIG} />; }
export function ResumeExecutive(props) { return <UniversalTemplate {...props} config={EXECUTIVE_CONFIG} />; }
export function ResumeCorporate(props) { return <UniversalTemplate {...props} config={CORPORATE_CONFIG} />; }
export function ResumeTech(props) { return <UniversalTemplate {...props} config={TECH_CONFIG} />; }
export function ResumeConsulting(props) { return <UniversalTemplate {...props} config={CONSULTING_CONFIG} />; }
export function ResumePM(props) { return <UniversalTemplate {...props} config={PM_CONFIG} />; }
export function ResumeCompact(props) { return <UniversalTemplate {...props} config={COMPACT_CONFIG} />; }
export function ResumeTwoColumn(props) { return <UniversalTemplate {...props} config={TWO_COLUMN_CONFIG} />; }
export function ResumeAcademic(props) { return <UniversalTemplate {...props} config={ACADEMIC_CONFIG} />; }
