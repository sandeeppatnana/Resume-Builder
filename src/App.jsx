import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Save, LayoutTemplate, Eye, Download, Plus, Trash2, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, ZoomIn, ZoomOut, Maximize2, X, Check, Pencil, FileText,
  GripVertical, MapPin, Mail, Phone, Globe,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import CountryCodePicker from "./CountryCodePicker";

export function normalizeToHtml(value) {
  if (Array.isArray(value)) {
    const valid = value.filter(Boolean);
    if (valid.length === 0) return "";
    return `<ul>${valid.map(item => `<li>${item}</li>`).join('')}</ul>`;
  }
  if (typeof value === "string") {
    if (!value.trim()) return "";
    const lower = value.toLowerCase();
    if (lower.includes("<p>") || lower.includes("<ul>") || lower.includes("<li>") || lower.includes("<h1>") || lower.includes("<h2>") || lower.includes("<blockquote>")) {
      return value;
    }
    return value.split("\n").filter(Boolean).map(line => `<p>${line}</p>`).join("");
  }
  return "";
}

const Github = ({ size = 24, className, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.34 6-1.53 6-6.6a5.54 5.54 0 0 0-1.64-3.9 5.09 5.09 0 0 0-.16-3.84s-1.3-.4-4.22 1.6a14.78 14.78 0 0 0-8 0C3.7 2.06 2.4 2.46 2.4 2.46a5.09 5.09 0 0 0-.16 3.84A5.54 5.54 0 0 0 .6 10.16c0 5.07 3 6.26 6 6.6a4.8 4.8 0 0 0-1 3.24v4" />
  </svg>
);
const Linkedin = ({ size = 24, className, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);

/* ---------------------------------------------------------------------- */
/* Utilities                                                               */
/* ---------------------------------------------------------------------- */

let uidCounter = 0;
function uid(prefix = "id") {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

const STORAGE_KEY = "resume-builder:data:v1";
const DEFAULT_SECTION_ORDER = ["summary", "experience", "skills", "projects", "education", "certifications", "Languages", "achievements", "links", "internships", "courses", "volunteering", "publications", "interests", "customSection"];
const DEFAULT_PAGE_SETTINGS = { size: "a4", orientation: "portrait", customWidth: 210, customHeight: 297, customUnit: "mm" };
const PAGE_UNITS = { mm: 1, cm: 10, in: 25.4 };

function normalizePageSettings(settings) {
  const next = { ...DEFAULT_PAGE_SETTINGS, ...(settings || {}) };
  if (!["a4", "a5", "custom"].includes(next.size)) next.size = "a4";
  if (!["portrait", "landscape"].includes(next.orientation)) next.orientation = "portrait";
  if (!Object.prototype.hasOwnProperty.call(PAGE_UNITS, next.customUnit)) next.customUnit = "mm";
  if (!Number.isFinite(Number(next.customWidth)) || Number(next.customWidth) <= 0) next.customWidth = 210;
  if (!Number.isFinite(Number(next.customHeight)) || Number(next.customHeight) <= 0) next.customHeight = 297;
  next.customWidth = Math.min(1000, Number(next.customWidth));
  next.customHeight = Math.min(1000, Number(next.customHeight));
  return next;
}

function pageDimensions(settings) {
  const pageSettings = normalizePageSettings(settings);
  const standard = pageSettings.size === "a5" ? [148, 210] : [210, 297];
  const unit = pageSettings.size === "custom" ? PAGE_UNITS[pageSettings.customUnit] : 1;
  const base = pageSettings.size === "custom" ? [pageSettings.customWidth * unit, pageSettings.customHeight * unit] : standard;
  return pageSettings.orientation === "landscape" ? { width: base[1], height: base[0] } : { width: base[0], height: base[1] };
}

function customSectionKey(id) {
  return `custom:${id}`;
}

function normalizeSectionOrder(order, customFields = []) {
  const saved = Array.isArray(order) ? order : [];
  const customKeys = customFields.map((field) => customSectionKey(field.id));
  const validKeys = new Set([...DEFAULT_SECTION_ORDER, ...customKeys]);
  return [...saved.filter((key) => validKeys.has(key)), ...[...DEFAULT_SECTION_ORDER, ...customKeys].filter((key) => !saved.includes(key))];
}

async function readResumeStorage() {
  if (window.storage?.get) return window.storage.get("resume-data", false);
  return { value: window.localStorage.getItem(STORAGE_KEY) };
}

async function writeResumeStorage(value) {
  if (window.storage?.set) return window.storage.set("resume-data", value, false);
  window.localStorage.setItem(STORAGE_KEY, value);
}

function defaultData() {
  return {
    personal: {
      fullName: "Sandeep Patnana",
      title: "QA Engineer | Quality Engineering | AI/GenAI Testing",
      email: "sandeep.patnana@email.com",
      phone: { countryCode: "+91", number: "9876543210" },
      location: "Hyderabad",
      country: "India",
      linkedin: "linkedin.com/in/sandeeppatnana",
      github: "github.com/sandeeppatnana",
      portfolio: "",
    },
    summary:
      "Detail-oriented QA Engineer with hands-on experience in functional, regression, API and end-to-end testing, defect management, and UAT coordination. Growing expertise in AI/GenAI testing, including LLM evaluation, prompt testing and RAG pipeline validation, within fast-paced Agile delivery teams.",
    experience: [
      {
        id: uid("exp"),
        jobTitle: "QA Engineer",
        company: "Aurumi Tech Holdings Pvt Ltd",
        location: "Hyderabad, India",
        startDate: "Jun 2024",
        endDate: "",
        current: true,
        summary: "",
        responsibilities: [
          "Designed and executed functional, regression, API and end-to-end testing.",
          "Managed defects through JIRA.",
          "Coordinated UAT activities.",
          "Supported Agile/Scrum delivery.",
        ],
      },
    ],
    skillGroups: [
      { id: uid("sg"), name: "Testing & Quality", skills: ["Functional Testing", "Regression Testing", "API Testing", "Performance Testing", "Mobile Testing", "UAT", "Defect Analysis"] },
      { id: uid("sg"), name: "Tools & Technologies", skills: ["Postman", "K6", "Grafana", "Git", "GitHub", "SQL", "PostgreSQL", "JIRA"] },
      { id: uid("sg"), name: "AI / GenAI", skills: ["LLM Testing", "Prompt Evaluation", "RAG Testing", "AI Test Case Design", "Model Evaluation", "Hallucination Testing"] },
      { id: uid("sg"), name: "Project Coordination", skills: ["Requirement Analysis", "Sprint Coordination", "Stakeholder Coordination", "Release Coordination"] },
    ],
    projects: [
      { id: uid("prj"), name: "API Test Suite \u2014 Authentication & CRUD Validation", description: "Built a reusable API automation suite covering authentication flows and CRUD operations, cutting manual regression time.", tools: "Postman, Newman, JavaScript", url: "", highlights: ["Automated 80+ API test cases across auth and CRUD endpoints.", "Integrated test runs into CI for early defect detection."] },
      { id: uid("prj"), name: "Performance Testing \u2014 K6 & Grafana", description: "Set up load and performance test scenarios to validate system behavior under expected and peak traffic.", tools: "K6, Grafana", url: "", highlights: ["Modeled realistic load profiles for key user journeys.", "Built Grafana dashboards to visualize latency and throughput."] },
      { id: uid("prj"), name: "GenAI Response Evaluation Framework", description: "A structured approach for evaluating LLM responses across accuracy, relevance, consistency, hallucination and safety.", tools: "Python, LLM APIs", url: "", highlights: ["Defined scoring rubrics across five evaluation dimensions.", "Ran systematic evaluations across multiple prompt variants."] },
      { id: uid("prj"), name: "RAG Pipeline Evaluation", description: "Evaluated retrieval-augmented generation pipelines for relevance and factual grounding of retrieved context.", tools: "Python, Vector DB, LLM APIs", url: "", highlights: ["Assessed retrieval precision and answer groundedness.", "Flagged hallucination-prone query patterns for the team."] },
      { id: uid("prj"), name: "Web & Mobile QA Regression Suite", description: "Maintained a cross-platform regression suite covering core web and mobile user flows.", tools: "Selenium, Appium", url: "", highlights: ["Reduced regression cycle time through prioritized test packs.", "Coordinated release sign-off with cross-functional teams."] },
    ],
    education: [
      { id: uid("edu"), degree: "B.Tech in Computer Science", institution: "Your University", location: "Hyderabad, India", startDate: "2019", endDate: "2023", grade: "", description: "" },
    ],

    Languages: [
      { id: uid("lang"), name: "English", proficiency: "Professional" },
    ],
    certifications: [
      { id: uid("cert"), name: "ISTQB Foundation Level", organization: "ISTQB", issueDate: "2023", url: "" },
    ],
    achievements: [],
    links: [],
    internships: [],
    courses: [],
    volunteering: [],
    publications: [],
    interests: [],
    customSection: { sectionTitle: "Custom Section", items: [] },
    customFields: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    pageSettings: { ...DEFAULT_PAGE_SETTINGS },
  };
}

const TEMPLATES = [
  { id: "ats", name: "ATS Classic", blurb: "Single column, no styling tricks. Best for job applications." },
  { id: "modern", name: "Modern", blurb: "Clean layout with a subtle accent color." },
  { id: "minimal", name: "Minimal", blurb: "Lots of whitespace, thin dividers, quiet typography." },
  { id: "professional", name: "Professional", blurb: "Two-column layout suited to experienced professionals." },
];

function fileSafe(str) {
  return (str || "").trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
}

/* ---------------------------------------------------------------------- */
/* Small form atoms                                                        */
/* ---------------------------------------------------------------------- */

function Field({ label, value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <label className={`block ${className}`.trim()}>
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder, rows = 4, showCount = false }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="block text-xs font-medium text-slate-500">{label}</span>
        {showCount && <span className="text-xs text-slate-400">{(value || "").length} characters</span>}
      </div>
      <textarea
        value={value || ""}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
      />
    </label>
  );
}

function IconBtn({ onClick, title, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}



function EntryCard({ title, onDelete, onMoveUp, onMoveDown, canUp, canDown, children, drag }) {
  const rowRef = useRef(null);
  return (
    <div
      ref={rowRef}
      draggable={false}
      onDragStart={drag?.onDragStart}
      onDragEnter={drag?.onDragEnter}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
      onDragEnd={drag?.onDragEnd}
      className={`rounded-lg border p-3 space-y-3 transition-colors ${drag?.isOver ? "border-teal-400 bg-teal-50/60" : "border-slate-200 bg-slate-50/60"
        } ${drag?.isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          {drag && <DragHandle rowRef={rowRef} />}
          <span className="text-xs font-semibold text-slate-600 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <IconBtn title="Move up" onClick={onMoveUp} disabled={!canUp}><ArrowUp size={13} /></IconBtn>
          <IconBtn title="Move down" onClick={onMoveDown} disabled={!canDown}><ArrowDown size={13} /></IconBtn>
          <IconBtn title="Delete" onClick={onDelete}><Trash2 size={13} /></IconBtn>
        </div>
      </div>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, open, onToggle, children, count, dragHandle, dragging }) {
  return (
    <div className={`border border-slate-200 rounded-lg bg-white overflow-hidden transition-all ${dragging ? "opacity-50 shadow-lg" : "hover:border-slate-300"}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          {dragHandle}
          {title}
          {typeof count === "number" && (
            <span className="text-xs font-normal text-slate-400">({count})</span>
          )}
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>
      {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
    </div>
  );
}

function moveItem(arr, index, dir) {
  const next = [...arr];
  const target = index + dir;
  if (target < 0 || target >= next.length) return arr;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Drag-to-reorder for a list. Returns a function that, given an index,
 * yields the drag event handlers + drag state for that row.
 */
function useDragReorder(list, onReorder) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  return (index) => ({
    isDragging: draggingIndex === index,
    isOver: overIndex === index && draggingIndex !== null && draggingIndex !== index,
    onDragStart: (e) => {
      setDraggingIndex(index);
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", String(index));
      } catch (err) {
        /* Safari requires setData to be called; ignore failures */
      }
    },
    onDragEnter: (e) => {
      e.preventDefault();
      if (draggingIndex !== null) setOverIndex(index);
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    onDrop: (e) => {
      e.preventDefault();
      const from = draggingIndex;
      if (from === null || from === index) {
        setDraggingIndex(null);
        setOverIndex(null);
        return;
      }
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      onReorder(next);
      setDraggingIndex(null);
      setOverIndex(null);
    },
    onDragEnd: () => {
      setDraggingIndex(null);
      setOverIndex(null);
    },
  });
}

/**
 * A drag handle that only makes its row draggable while the handle
 * itself is pressed, so dragging never fights with clicking/typing
 * inside the row's inputs.
 */
function DragHandle({ rowRef, size = 14, className = "" }) {
  const enable = () => rowRef.current && rowRef.current.setAttribute("draggable", "true");
  const disable = () => rowRef.current && rowRef.current.setAttribute("draggable", "false");
  return (
    <span
      onMouseDown={enable}
      onMouseUp={disable}
      onTouchStart={enable}
      onTouchEnd={disable}
      title="Drag to reorder"
      className={`inline-flex items-center justify-center h-6 w-5 rounded border border-slate-300 bg-white text-slate-500 hover:text-teal-700 hover:border-teal-400 hover:bg-teal-50 cursor-grab active:cursor-grabbing shrink-0 ${className}`}
    >
      <GripVertical size={size} />
    </span>
  );
}

function SectionDragHandle({ label, onPointerDown, onKeyDown }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Drag ${label} to change its position`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      title="Drag to reorder"
      className="inline-flex items-center justify-center h-7 w-6 rounded border border-slate-300 bg-white text-slate-500 hover:text-teal-700 hover:border-teal-400 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
    >
      <GripVertical size={15} />
    </span>
  );
}

function SortableSectionList({ items, onReorder, renderItem }) {
  const listRef = useRef(null);
  const dragStateRef = useRef({ draggingIndex: null, overIndex: null });
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const moveTo = (from, to) => {
    if (from === null || to === null || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, moved);
    onReorder(next);
  };

  const finishPointerDrag = () => {
    moveTo(dragStateRef.current.draggingIndex, dragStateRef.current.overIndex);
    dragStateRef.current = { draggingIndex: null, overIndex: null };
    setDraggingIndex(null);
    setOverIndex(null);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", finishPointerDrag);
  };

  const handlePointerMove = (event) => {
    if (dragStateRef.current.draggingIndex === null || !listRef.current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-sortable-section]");
    if (!target || !listRef.current.contains(target)) return;
    const index = Number(target.getAttribute("data-section-index"));
    const rect = target.getBoundingClientRect();
    const nextOverIndex = event.clientY > rect.top + rect.height / 2 ? index + 1 : index;
    dragStateRef.current.overIndex = nextOverIndex;
    setOverIndex(nextOverIndex);
  };

  const startPointerDrag = (index, event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    dragStateRef.current = { draggingIndex: index, overIndex: index };
    setDraggingIndex(index);
    setOverIndex(index);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishPointerDrag);
  };

  const handleKeyDown = (index, event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const target = event.key === "ArrowUp" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  };

  return (
    <div ref={listRef} className="space-y-3">
      {items.map((item, index) => (
        <div key={item.key} data-sortable-section data-section-index={index} className="relative">
          {overIndex === index && draggingIndex !== null && draggingIndex !== index && <div className="absolute -top-2 left-0 right-0 h-0.5 bg-teal-500 rounded" />}
          {renderItem(item, index, {
            dragging: draggingIndex === index,
            handle: <SectionDragHandle label={item.label} onPointerDown={(event) => startPointerDrag(index, event)} onKeyDown={(event) => handleKeyDown(index, event)} />,
          })}
        </div>
      ))}
      {overIndex === items.length && draggingIndex !== null && <div className="h-0.5 bg-teal-500 rounded" />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Section editors                                                         */
/* ---------------------------------------------------------------------- */

function PersonalEditor({ data, update }) {
  const p = data.personal;
  const set = (key) => (val) => update({ personal: { ...p, [key]: val } });

  // Backwards compatibility safety: 
  const currentPhoneObj = typeof p.phone === 'object' && p.phone !== null ? p.phone : {
    countryCode: typeof p.phone === 'string' ? (p.phone.split(' ')[0] || '+91') : '+91',
    number: typeof p.phone === 'string' ? (p.phone.replace(/^\+\d+\s?/, '') || '') : ''
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Full name" value={p.fullName} onChange={set("fullName")} />
      <Field label="Professional title" value={p.title} onChange={set("title")} />
      <Field label="Email" type="email" value={p.email} onChange={set("email")} />

      <div>
        <span className="block text-xs font-medium text-slate-500 mb-1">Phone Number</span>
        <div className="flex gap-2">
          <CountryCodePicker
            value={currentPhoneObj.countryCode}
            onChange={(code, name) => {
              set("phone")({ ...currentPhoneObj, countryCode: code });
              if (name && !p.country) { set("country")(name); }
            }}
          />
          <input
            type="tel"
            value={currentPhoneObj.number}
            onChange={(e) => set("phone")({ ...currentPhoneObj, number: e.target.value })}
            placeholder="9876543210"
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-w-0"
          />
        </div>
      </div>

      <Field label="City / State" value={p.location} onChange={set("location")} />
      <Field label="Country" value={p.country} onChange={set("country")} />

      <Field label="LinkedIn" value={p.linkedin} onChange={set("linkedin")} />
      <Field label="GitHub" value={p.github} onChange={set("github")} />
      <Field label="Portfolio" value={p.portfolio} onChange={set("portfolio")} className="col-span-2" />
    </div>
  );
}

function SummaryEditor({ data, update }) {
  return (
    <RichTextEditor
      label="Professional summary"
      value={normalizeToHtml(data.summary)}
      onChange={(v) => update({ summary: v })}
      placeholder="A short professional summary..."
    />
  );
}

function ExperienceEditor({ data, update }) {
  const list = data.experience;
  const setList = (next) => update({ experience: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => {
    setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  };
  return (
    <div className="space-y-3">
      {list.map((exp, i) => (
        <EntryCard
          key={exp.id}
          title={exp.jobTitle || "New position"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))}
          onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0}
          canDown={i < list.length - 1}
          drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Job title" value={exp.jobTitle} onChange={(v) => setItem(exp.id, { jobTitle: v })} />
            <Field label="Company" value={exp.company} onChange={(v) => setItem(exp.id, { company: v })} />
            <Field label="Location" value={exp.location} onChange={(v) => setItem(exp.id, { location: v })} />
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                <input
                  type="checkbox"
                  checked={!!exp.current}
                  onChange={(e) => setItem(exp.id, { current: e.target.checked, endDate: e.target.checked ? "" : exp.endDate })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Current position
              </label>
            </div>
            <Field label="Start date" value={exp.startDate} onChange={(v) => setItem(exp.id, { startDate: v })} placeholder="Jun 2024" />
            <Field
              label="End date"
              value={exp.current ? "Present" : exp.endDate}
              onChange={(v) => setItem(exp.id, { endDate: v })}
              placeholder="Present"
              type="text"
            />
          </div>
          <RichTextEditor
            label="Description & Responsibilities"
            value={exp.summary?.includes('<') ? exp.summary : normalizeToHtml(exp.summary) + normalizeToHtml(exp.responsibilities)}
            onChange={(v) => setItem(exp.id, { summary: v, responsibilities: [] })}
          />
        </EntryCard>
      ))}
      <button
        type="button"
        onClick={() =>
          setList([
            ...list,
            { id: uid("exp"), jobTitle: "", company: "", location: "", startDate: "", endDate: "", current: false, summary: "", responsibilities: [""] },
          ])
        }
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        <Plus size={14} /> Add experience
      </button>
    </div>
  );
}

function SkillsEditor({ data, update }) {
  const groups = data.skillGroups;
  const setGroups = (next) => update({ skillGroups: next });
  const dragProps = useDragReorder(groups, setGroups);
  const [drafts, setDrafts] = useState({});

  const setGroup = (i, patch) => {
    const next = [...groups];
    next[i] = { ...next[i], ...patch };
    setGroups(next);
  };
  const addSkill = (i) => {
    const val = (drafts[groups[i].id] || "").trim();
    if (!val) return;
    setGroup(i, { skills: [...groups[i].skills, val] });
    setDrafts({ ...drafts, [groups[i].id]: "" });
  };
  const removeSkill = (i, skillIdx) => {
    const next = groups[i].skills.filter((_, idx) => idx !== skillIdx);
    setGroup(i, { skills: next });
  };
  const moveSkill = (i, skillIdx, dir) => {
    setGroup(i, { skills: moveItem(groups[i].skills, skillIdx, dir) });
  };

  return (
    <div className="space-y-3">
      {groups.map((g, i) => (
        <EntryCard
          key={g.id}
          title={g.name || "New skill group"}
          onDelete={() => setGroups(groups.filter((_, idx) => idx !== i))}
          onMoveUp={() => setGroups(moveItem(groups, i, -1))}
          onMoveDown={() => setGroups(moveItem(groups, i, 1))}
          canUp={i > 0}
          canDown={i < groups.length - 1}
          drag={dragProps(i)}
        >
          <Field label="Group name" value={g.name} onChange={(v) => setGroup(i, { name: v })} />
          <div className="flex flex-wrap gap-1.5">
            {g.skills.map((s, si) => (
              <span key={si} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white pl-2.5 pr-1 py-1 text-xs text-slate-700">
                {s}
                <button type="button" onClick={() => moveSkill(i, si, -1)} disabled={si === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30">
                  <ArrowUp size={10} />
                </button>
                <button type="button" onClick={() => moveSkill(i, si, 1)} disabled={si === g.skills.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30">
                  <ArrowDown size={10} />
                </button>
                <button type="button" onClick={() => removeSkill(i, si)} className="text-slate-400 hover:text-red-600">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={drafts[g.id] || ""}
              onChange={(e) => setDrafts({ ...drafts, [g.id]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill(i);
                }
              }}
              placeholder="Add a skill and press Enter"
              className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button type="button" onClick={() => addSkill(i)} className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800">
              <Plus size={13} /> Add skill
            </button>
          </div>
        </EntryCard>
      ))}
      <button
        type="button"
        onClick={() => setGroups([...groups, { id: uid("sg"), name: "New skill group", skills: [] }])}
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        <Plus size={14} /> Add skill group
      </button>
    </div>
  );
}

function ProjectsEditor({ data, update }) {
  const list = data.projects;
  const setList = (next) => update({ projects: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => {
    setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  };
  return (
    <div className="space-y-3">
      {list.map((prj, i) => (
        <EntryCard
          key={prj.id}
          title={prj.name || "New project"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))}
          onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0}
          canDown={i < list.length - 1}
          drag={dragProps(i)}
        >
          <Field label="Project name" value={prj.name} onChange={(v) => setItem(prj.id, { name: v })} />
          <RichTextEditor
            label="Description & Highlights"
            value={prj.description?.includes('<') ? prj.description : normalizeToHtml(prj.description) + normalizeToHtml(prj.highlights)}
            onChange={(v) => setItem(prj.id, { description: v, highlights: [] })}
          />
        </EntryCard>
      ))}
      <button
        type="button"
        onClick={() => setList([...list, { id: uid("prj"), name: "", description: "", tools: "", url: "", highlights: [""] }])}
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        <Plus size={14} /> Add project
      </button>
    </div>
  );
}

function EducationEditor({ data, update }) {
  const list = data.education;
  const setList = (next) => update({ education: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => {
    setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  };
  return (
    <div className="space-y-3">
      {list.map((edu, i) => (
        <EntryCard
          key={edu.id}
          title={edu.degree || "New entry"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))}
          onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0}
          canDown={i < list.length - 1}
          drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Degree" value={edu.degree} onChange={(v) => setItem(edu.id, { degree: v })} />
            <Field label="Institution" value={edu.institution} onChange={(v) => setItem(edu.id, { institution: v })} />
            <Field label="Location" value={edu.location} onChange={(v) => setItem(edu.id, { location: v })} />
            <Field label="Grade / CGPA" value={edu.grade} onChange={(v) => setItem(edu.id, { grade: v })} />
            <Field label="Start date" value={edu.startDate} onChange={(v) => setItem(edu.id, { startDate: v })} />
            <Field label="End date" value={edu.endDate} onChange={(v) => setItem(edu.id, { endDate: v })} />
          </div>
          <RichTextEditor
            label="Description"
            value={normalizeToHtml(edu.description)}
            onChange={(v) => setItem(edu.id, { description: v })}
          />
        </EntryCard>
      ))}
      <button
        type="button"
        onClick={() => setList([...list, { id: uid("edu"), degree: "", institution: "", location: "", startDate: "", endDate: "", grade: "" }])}
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        <Plus size={14} /> Add education
      </button>
    </div>
  );
}

function CertificationsEditor({ data, update }) {
  const list = data.certifications;
  const setList = (next) => update({ certifications: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => {
    setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  };
  return (
    <div className="space-y-3">
      {list.map((c, i) => (
        <EntryCard
          key={c.id}
          title={c.name || "New certification"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))}
          onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0}
          canDown={i < list.length - 1}
          drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={c.name} onChange={(v) => setItem(c.id, { name: v })} />
            <Field label="Organization" value={c.organization} onChange={(v) => setItem(c.id, { organization: v })} />
            <Field label="Issue Date" value={c.issueDate} onChange={(v) => setItem(c.id, { issueDate: v })} />
            <Field label="Link" value={c.url} onChange={(v) => setItem(c.id, { url: v })} />
          </div>
        </EntryCard>
      ))}
      <button
        type="button"
        onClick={() => setList([...list, { id: uid("cert"), name: "", organization: "", issueDate: "", url: "" }])}
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        <Plus size={14} /> Add certification
      </button>
    </div>
  );
}

function AchievementsEditor({ data, update }) {
  const list = data.achievements || [];
  const setList = (next) => update({ achievements: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {list.map((c, i) => (
        <EntryCard
          key={c.id} title={c.title || "New achievement"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title" value={c.title} onChange={(v) => setItem(c.id, { title: v })} />
            <Field label="Organization" value={c.organization} onChange={(v) => setItem(c.id, { organization: v })} />
            <Field label="Date" value={c.date} onChange={(v) => setItem(c.id, { date: v })} />
          </div>
          <RichTextEditor label="Description" value={normalizeToHtml(c.description)} onChange={(v) => setItem(c.id, { description: v })} />
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("ach"), title: "", organization: "", date: "", description: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add achievement
      </button>
    </div>
  );
}

function LanguagesEditor({ data, update }) {
  const list = data.Languages || [];
  const setList = (next) => update({ Languages: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {list.map((c, i) => (
        <EntryCard
          key={c.id} title={c.name || "New language"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Language" value={c.name} onChange={(v) => setItem(c.id, { name: v })} />
            <Field label="Proficiency" value={c.proficiency} onChange={(v) => setItem(c.id, { proficiency: v })} placeholder="e.g. Native, Fluent, Beginner" />
          </div>
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("lang"), name: "", proficiency: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add language
      </button>
    </div>
  );
}

function LinksEditor({ data, update }) {
  const list = data.links || [];
  const setList = (next) => update({ links: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {list.map((c, i) => (
        <EntryCard
          key={c.id} title={c.platform || "New link"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform Name" value={c.platform} onChange={(v) => setItem(c.id, { platform: v })} placeholder="e.g. Medium, Twitter" />
            <Field label="URL" value={c.url} onChange={(v) => setItem(c.id, { url: v })} />
          </div>
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("lnk"), platform: "", url: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add link
      </button>
    </div>
  );
}

function InternshipsEditor({ data, update }) {
  const list = data.internships || [];
  const setList = (next) => update({ internships: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {list.map((exp, i) => (
        <EntryCard
          key={exp.id} title={exp.jobTitle || "New internship"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role" value={exp.jobTitle} onChange={(v) => setItem(exp.id, { jobTitle: v })} />
            <Field label="Company" value={exp.company} onChange={(v) => setItem(exp.id, { company: v })} />
            <Field label="Location" value={exp.location} onChange={(v) => setItem(exp.id, { location: v })} />
            <div />
            <Field label="Start date" value={exp.startDate} onChange={(v) => setItem(exp.id, { startDate: v })} />
            <Field label="End date" value={exp.endDate} onChange={(v) => setItem(exp.id, { endDate: v })} />
          </div>
          <RichTextEditor label="Description" value={normalizeToHtml(exp.summary)} onChange={(v) => setItem(exp.id, { summary: v })} />
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("int"), jobTitle: "", company: "", location: "", startDate: "", endDate: "", summary: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add internship
      </button>
    </div>
  );
}

function CoursesEditor({ data, update }) {
  const list = data.courses || [];
  const setList = (next) => update({ courses: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {list.map((c, i) => (
        <EntryCard
          key={c.id} title={c.name || "New course"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Course Name" value={c.name} onChange={(v) => setItem(c.id, { name: v })} />
            <Field label="Provider" value={c.provider} onChange={(v) => setItem(c.id, { provider: v })} />
            <Field label="Completion Date" value={c.date} onChange={(v) => setItem(c.id, { date: v })} />
            <Field label="Credential/URL" value={c.url} onChange={(v) => setItem(c.id, { url: v })} />
          </div>
          <RichTextEditor label="Description" value={normalizeToHtml(c.description)} onChange={(v) => setItem(c.id, { description: v })} />
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("crs"), name: "", provider: "", date: "", url: "", description: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add course
      </button>
    </div>
  );
}

function VolunteeringEditor({ data, update }) {
  const list = data.volunteering || [];
  const setList = (next) => update({ volunteering: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {list.map((exp, i) => (
        <EntryCard
          key={exp.id} title={exp.role || "New volunteer experience"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Organization" value={exp.organization} onChange={(v) => setItem(exp.id, { organization: v })} />
            <Field label="Role" value={exp.role} onChange={(v) => setItem(exp.id, { role: v })} />
            <Field label="Start date" value={exp.startDate} onChange={(v) => setItem(exp.id, { startDate: v })} />
            <Field label="End date" value={exp.endDate} onChange={(v) => setItem(exp.id, { endDate: v })} />
          </div>
          <RichTextEditor label="Description" value={normalizeToHtml(exp.description)} onChange={(v) => setItem(exp.id, { description: v })} />
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("vol"), organization: "", role: "", startDate: "", endDate: "", description: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add volunteer experience
      </button>
    </div>
  );
}

function PublicationsEditor({ data, update }) {
  const list = data.publications || [];
  const setList = (next) => update({ publications: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {list.map((c, i) => (
        <EntryCard
          key={c.id} title={c.title || "New publication"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title" value={c.title} onChange={(v) => setItem(c.id, { title: v })} />
            <Field label="Publisher" value={c.publisher} onChange={(v) => setItem(c.id, { publisher: v })} />
            <Field label="Publication Date" value={c.date} onChange={(v) => setItem(c.id, { date: v })} />
            <Field label="URL" value={c.url} onChange={(v) => setItem(c.id, { url: v })} />
          </div>
          <RichTextEditor label="Description" value={normalizeToHtml(c.description)} onChange={(v) => setItem(c.id, { description: v })} />
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("pub"), title: "", publisher: "", date: "", url: "", description: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add publication
      </button>
    </div>
  );
}

function InterestsEditor({ data, update }) {
  const list = data.interests || [];
  const setList = (next) => update({ interests: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {list.map((c, i) => (
        <EntryCard
          key={c.id} title={c.name || "New interest"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <Field label="Interest / Hobby" value={c.name} onChange={(v) => setItem(c.id, { name: v })} />
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("int"), name: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add interest
      </button>
    </div>
  );
}

function CustomSectionEditor({ data, update }) {
  const customSection = data.customSection || { sectionTitle: "Custom Section", items: [] };
  const list = customSection.items || [];
  const setSection = (patch) => update({ customSection: { ...customSection, ...patch } });
  const setList = (next) => setSection({ items: next });
  const dragProps = useDragReorder(list, setList);
  const setItem = (id, patch) => setList(list.map(item => item.id === id ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      <Field label="Section Title" value={customSection.sectionTitle} onChange={(v) => setSection({ sectionTitle: v })} />
      <hr className="border-slate-200 my-2" />
      {list.map((c, i) => (
        <EntryCard
          key={c.id} title={c.entryTitle || "New entry"}
          onDelete={() => setList(list.filter((_, idx) => idx !== i))}
          onMoveUp={() => setList(moveItem(list, i, -1))} onMoveDown={() => setList(moveItem(list, i, 1))}
          canUp={i > 0} canDown={i < list.length - 1} drag={dragProps(i)}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry Title" value={c.entryTitle} onChange={(v) => setItem(c.id, { entryTitle: v })} />
            <Field label="Date" value={c.date} onChange={(v) => setItem(c.id, { date: v })} />
            <Field label="URL" value={c.url} onChange={(v) => setItem(c.id, { url: v })} className="col-span-2" />
          </div>
          <RichTextEditor label="Description" value={normalizeToHtml(c.description)} onChange={(v) => setItem(c.id, { description: v })} />
        </EntryCard>
      ))}
      <button type="button" onClick={() => setList([...list, { id: uid("cust"), entryTitle: "", date: "", url: "", description: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <Plus size={14} /> Add entry
      </button>
    </div>
  );
}

function CustomFieldCard({ field, onChange, onDelete, drag }) {
  return (
    <EntryCard
      title={field.title || "New custom field"}
      onDelete={onDelete}
      onMoveUp={() => { }}
      onMoveDown={() => { }}
      canUp={false}
      canDown={false}
      drag={drag}
    >
      <Field label="Section title" value={field.title} onChange={(value) => onChange({ title: value })} placeholder="Awards, Publications, Volunteer work..." />
      <RichTextEditor
        label="Content / Description"
        value={field.description?.includes('<') ? field.description : normalizeToHtml(field.description) + normalizeToHtml(field.bullets)}
        onChange={(value) => onChange({ description: value, bullets: [] })}
      />
    </EntryCard>
  );
}

/* ---------------------------------------------------------------------- */
/* Resume templates                                                        */
/* ---------------------------------------------------------------------- */

function pageStyle(pageSettings) {
  const dimensions = pageDimensions(pageSettings);
  return {
    width: `${dimensions.width}mm`,
    minHeight: `${dimensions.height}mm`,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  };
}

function sectionOrderStyle(data, key) {
  return { order: normalizeSectionOrder(data.sectionOrder, data.customFields).indexOf(key) };
}

function CustomFieldSection({ field, style, variant = "ats" }) {
  const styles = {
    ats: { wrapper: "mb-3", heading: "text-[12px] font-bold uppercase tracking-wide border-b border-black pb-0.5 mb-1.5", description: "text-[11.5px] leading-relaxed whitespace-pre-wrap", bullet: "text-[11px] leading-snug whitespace-pre-wrap" },
    modern: { wrapper: "mb-4", heading: "text-[11px] font-bold uppercase tracking-widest mb-2 text-teal-600", description: "text-[11.5px] leading-relaxed text-slate-700 whitespace-pre-wrap", bullet: "text-[11px] leading-snug text-slate-700 whitespace-pre-wrap" },
    minimal: { wrapper: "mb-4 pt-3 border-t border-slate-100", heading: "text-[10px] font-medium uppercase tracking-[0.15em] mb-2 text-slate-400", description: "text-[11px] leading-relaxed text-slate-600 whitespace-pre-wrap", bullet: "text-[10.5px] leading-snug text-slate-600 whitespace-pre-wrap" },
    professional: { wrapper: "mb-4", heading: "text-[11px] font-bold uppercase tracking-wide text-slate-800 border-b border-slate-300 pb-1 mb-2", description: "text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap", bullet: "text-[10.5px] leading-snug text-slate-700 whitespace-pre-wrap" },
  }[variant];
  const bullets = (field.bullets || []).filter(Boolean);
  if (!field.title && !field.description && bullets.length === 0) return null;
  return (
    <section className={styles.wrapper + " break-inside-avoid"} style={style}>
      {field.title && <h2 className={styles.heading}>{field.title}</h2>}
      {(field.description || bullets.length > 0) && (
        <div className={`resume-richtext ${styles.description}`} dangerouslySetInnerHTML={{ __html: field.description?.includes('<') ? field.description : normalizeToHtml(field.description) + normalizeToHtml(bullets) }} />
      )}
    </section>
  );
}

function formatPhone(value) {
  if (!value) return "";
  if (typeof value === "object") {
    const rawNum = String(value.number || "").replace(/\D/g, "");
    if (!rawNum) return "";
    let formattedNum = rawNum;
    if (rawNum.length === 10) formattedNum = `${rawNum.slice(0, 5)} ${rawNum.slice(5)}`;
    return `${value.countryCode || ""} ${formattedNum}`.trim();
  }
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91 ${digits.slice(1, 6)} ${digits.slice(6)}`;
  return raw;
}

function hrefFor(kind, value) {
  const v = String(value || "").trim();
  if (!v) return undefined;
  if (kind === "email") return `mailto:${v}`;
  if (kind === "phone") {
    const tel = v.replace(/[^\d+]/g, "");
    return tel ? `tel:${tel}` : undefined;
  }
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function displayUrl(value) {
  return String(value || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function contactItems(p) {
  const locStr = [p.location, p.country].filter(Boolean).join(", ");
  return [
    { key: "location", label: locStr, icon: MapPin },
    { key: "email", label: p.email, href: hrefFor("email", p.email), icon: Mail },
    { key: "phone", label: formatPhone(p.phone), href: hrefFor("phone", typeof p.phone === "object" ? (p.phone.countryCode || "") + (p.phone.number || "") : p.phone), icon: Phone },
    { key: "linkedin", label: displayUrl(p.linkedin), href: hrefFor("url", p.linkedin), icon: Linkedin },
    { key: "github", label: displayUrl(p.github), href: hrefFor("url", p.github), icon: Github },
    { key: "portfolio", label: displayUrl(p.portfolio), href: hrefFor("url", p.portfolio), icon: Globe },
  ].filter((item) => item.label);
}

function ContactLink({ href, children, className = "" }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a href={href} className={`text-inherit no-underline hover:underline underline-offset-2 ${className}`.trim()}>
      {children}
    </a>
  );
}

function ContactLine({ p, className, withIcons = false }) {
  const items = contactItems(p);
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className || ""}`}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <span key={item.key} className="inline-flex items-center gap-1">
            {i > 0 && !withIcons && <span className="text-current opacity-40 select-none" aria-hidden>|</span>}
            {withIcons && <Icon className="shrink-0 opacity-70" size={11} strokeWidth={2} aria-hidden />}
            <ContactLink href={item.href}>{item.label}</ContactLink>
          </span>
        );
      })}
    </div>
  );
}

function ContactStack({ p, className }) {
  const items = contactItems(p);
  if (items.length === 0) return null;
  return (
    <div className={className}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <p key={item.key} className="text-[10px] text-slate-600 flex items-start gap-1.5 leading-snug">
            <Icon className="shrink-0 mt-0.5 opacity-70" size={11} strokeWidth={2} aria-hidden />
            <ContactLink href={item.href} className="break-all">{item.label}</ContactLink>
          </p>
        );
      })}
    </div>
  );
}

function ResumeATS({ data, pageSettings }) {
  const { personal: p, summary, experience, skillGroups, projects, education, certifications } = data;
  return (
    <div id="resume-print-page" className="bg-white text-black flex flex-col" style={{ ...pageStyle(pageSettings), padding: "16mm 18mm" }}>
      <h1 className="text-[22px] font-bold tracking-tight">{p.fullName}</h1>
      {p.title && <p className="text-[12.5px] mt-0.5">{p.title}</p>}
      <ContactLine p={p} className="text-[11px] mt-1.5 text-black" />
      <hr className="my-3 border-black" />

      {summary && (
        <Section title="Summary" style={sectionOrderStyle(data, "summary")}>
          <div className="text-[11.5px] leading-relaxed resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(summary) }} />
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience" style={sectionOrderStyle(data, "experience")}>
          {experience.map((e) => (
            <div key={e.id} className="mb-2.5 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[12.5px] font-bold">{e.jobTitle}</span>
                <span className="text-[11px]">{e.startDate}{(e.startDate || e.endDate || e.current) && " \u2013 "}{e.current ? "Present" : e.endDate}</span>
              </div>
              <div className="flex justify-between items-baseline text-[11.5px] italic">
                <span>{e.company}</span>
                <span>{e.location}</span>
              </div>
              {(e.summary || e.responsibilities?.filter(Boolean).length > 0) && (
                <div className="text-[11px] mt-1 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: e.summary?.includes('<') ? e.summary : normalizeToHtml(e.summary) + normalizeToHtml(e.responsibilities) }} />
              )}
            </div>
          ))}
        </Section>
      )}

      {skillGroups.length > 0 && (
        <Section title="Skills" style={sectionOrderStyle(data, "skills")}>
          {skillGroups.map((g) => (
            <p key={g.id} className="text-[11px] mb-0.5 break-inside-avoid">
              <span className="font-bold">{g.name}: </span>
              {g.skills.join(", ")}
            </p>
          ))}
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects" style={sectionOrderStyle(data, "projects")}>
          {projects.map((pr) => (
            <div key={pr.id} className="mb-2 last:mb-0 break-inside-avoid">
              <p className="text-[12px] font-bold">{pr.name}</p>
              {(pr.description || pr.highlights?.filter(Boolean).length > 0) && (
                <div className="text-[11px] mt-0.5 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: pr.description?.includes('<') ? pr.description : normalizeToHtml(pr.description) + normalizeToHtml(pr.highlights) }} />
              )}
              {pr.tools && <p className="text-[11px] italic mt-0.5">Tools: {pr.tools}</p>}
            </div>
          ))}
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education" style={sectionOrderStyle(data, "education")}>
          {education.map((ed) => (
            <div key={ed.id} className="mb-1.5 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="text-[11.5px] font-bold">{ed.degree}</p>
                  <p className="text-[11px]">{ed.institution}{ed.location && `, ${ed.location}`}{ed.grade && ` \u2014 ${ed.grade}`}</p>
                </div>
                <span className="text-[11px]">{ed.startDate}{(ed.startDate || ed.endDate) && " \u2013 "}{ed.endDate}</span>
              </div>
              {ed.description && (
                <div className="text-[11px] mt-0.5 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(ed.description) }} />
              )}
            </div>
          ))}
        </Section>
      )}
      {certifications.length > 0 && (
        <Section title="Certifications" style={sectionOrderStyle(data, "certifications")}>
          {certifications.map((c) => (
            <p key={c.id} className="text-[11px] mb-0.5 break-inside-avoid">
              <span className="font-bold">{c.name}</span>{c.organization && ` \u2014 ${c.organization}`}{c.issueDate && ` (${c.issueDate})`}
            </p>
          ))}
        </Section>
      )}
      {data.Languages?.length > 0 && (
        <Section title="Languages" style={sectionOrderStyle(data, "Languages")}>
          {data.Languages.map((l) => (
            <p key={l.id} className="text-[11px] mb-0.5 break-inside-avoid">
              <span className="font-bold">{l.name}</span>{l.proficiency && ` \u2014 ${l.proficiency}`}
            </p>
          ))}
        </Section>
      )}
      {data.achievements?.length > 0 && (
        <Section title="Achievements" style={sectionOrderStyle(data, "achievements")}>
          {data.achievements.map((a) => (
            <div key={a.id} className="mb-1.5 last:mb-0 break-inside-avoid">
              <p className="text-[11.5px] font-bold">{a.title}{a.date && <span className="text-[11px] font-normal float-right">{a.date}</span>}</p>
              {a.organization && <p className="text-[11px] italic">{a.organization}</p>}
              {a.description && <div className="text-[11px] mt-0.5 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(a.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.links?.length > 0 && (
        <Section title="Links" style={sectionOrderStyle(data, "links")}>
          <div className="flex flex-wrap gap-x-4">
            {data.links.map((l) => (
              <a key={l.id} href={l.url} className="text-[11px] hover:underline" target="_blank" rel="noreferrer">
                <span className="font-bold">{l.platform}</span>: {l.url}
              </a>
            ))}
          </div>
        </Section>
      )}
      {data.internships?.length > 0 && (
        <Section title="Internships" style={sectionOrderStyle(data, "internships")}>
          {data.internships.map((e) => (
            <div key={e.id} className="mb-2.5 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[12.5px] font-bold">{e.jobTitle}</span>
                <span className="text-[11px]">{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
              </div>
              <div className="flex justify-between items-baseline text-[11.5px] italic">
                <span>{e.company}</span>
                <span>{e.location}</span>
              </div>
              {e.summary && <div className="text-[11px] mt-1 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.summary) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.courses?.length > 0 && (
        <Section title="Courses" style={sectionOrderStyle(data, "courses")}>
          {data.courses.map((c) => (
            <div key={c.id} className="mb-1.5 last:mb-0 break-inside-avoid">
              <p className="text-[11.5px] font-bold">{c.name}{c.date && <span className="text-[11px] font-normal float-right">{c.date}</span>}</p>
              {(c.provider || c.url) && <p className="text-[11px] italic">{c.provider}{c.url && ` \u2014 ${c.url}`}</p>}
              {c.description && <div className="text-[11px] mt-0.5 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(c.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.volunteering?.length > 0 && (
        <Section title="Volunteering" style={sectionOrderStyle(data, "volunteering")}>
          {data.volunteering.map((e) => (
            <div key={e.id} className="mb-2.5 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[12.5px] font-bold">{e.role}</span>
                <span className="text-[11px]">{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
              </div>
              <div className="text-[11.5px] italic">{e.organization}</div>
              {e.description && <div className="text-[11px] mt-1 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.publications?.length > 0 && (
        <Section title="Publications" style={sectionOrderStyle(data, "publications")}>
          {data.publications.map((p) => (
            <div key={p.id} className="mb-1.5 last:mb-0 break-inside-avoid">
              <p className="text-[11.5px] font-bold">{p.title}{p.date && <span className="text-[11px] font-normal float-right">{p.date}</span>}</p>
              {(p.publisher || p.url) && <p className="text-[11px] italic">{p.publisher}{p.url && ` \u2014 ${p.url}`}</p>}
              {p.description && <div className="text-[11px] mt-0.5 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(p.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.interests?.length > 0 && (
        <Section title="Interests" style={sectionOrderStyle(data, "interests")}>
          <p className="text-[11px] mb-0.5 break-inside-avoid">
            {data.interests.map(i => i.name).filter(Boolean).join(" \u2022 ")}
          </p>
        </Section>
      )}
      {data.customSection?.items?.length > 0 && (
        <Section title={data.customSection.sectionTitle || "Custom Section"} style={sectionOrderStyle(data, "customSection")}>
          {data.customSection.items.map((i) => (
            <div key={i.id} className="mb-1.5 last:mb-0 break-inside-avoid">
              <p className="text-[11.5px] font-bold">{i.entryTitle}{i.date && <span className="text-[11px] font-normal float-right">{i.date}</span>}</p>
              {i.url && <p className="text-[11px] italic">{i.url}</p>}
              {i.description && <div className="text-[11px] mt-0.5 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(i.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {(data.customFields || []).map((field) => (
        <CustomFieldSection key={field.id} field={field} style={sectionOrderStyle(data, customSectionKey(field.id))} />
      ))
      }
    </div >
  );

  function Section({ title, children, style }) {
    return (
      <div className="mb-3" style={style}>
        <h2 className="text-[12px] font-bold uppercase tracking-wide border-b border-black pb-0.5 mb-1.5">{title}</h2>
        {children}
      </div>
    );
  }
}

function ResumeModern({ data, pageSettings }) {
  const { personal: p, summary, experience, skillGroups, projects, education, certifications } = data;
  const accent = "#0d9488";
  return (
    <div id="resume-print-page" className="bg-white text-slate-800 flex flex-col" style={{ ...pageStyle(pageSettings), padding: "16mm 18mm" }}>
      <h1 className="text-[26px] font-bold" style={{ color: "#0f172a" }}>{p.fullName}</h1>
      {p.title && <p className="text-[13px] font-medium mt-0.5" style={{ color: accent }}>{p.title}</p>}
      <ContactLine p={p} withIcons className="text-[10.5px] mt-1.5 text-slate-500" />
      <div className="h-[3px] mt-3 mb-4 rounded" style={{ background: accent, width: "48px" }} />

      {summary && (
        <Section title="Summary" accent={accent} style={sectionOrderStyle(data, "summary")}>
          <div className="text-[11.5px] leading-relaxed text-slate-700 resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(summary) }} />
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience" accent={accent} style={sectionOrderStyle(data, "experience")}>
          {experience.map((e) => (
            <div key={e.id} className="mb-3 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] font-semibold text-slate-900">{e.jobTitle}</span>
                <span className="text-[10.5px] text-slate-500">{e.startDate}{(e.startDate || e.endDate || e.current) && " \u2013 "}{e.current ? "Present" : e.endDate}</span>
              </div>
              <div className="flex justify-between items-baseline text-[11.5px] mt-0.5" style={{ color: accent }}>
                <span className="font-medium">{e.company}</span>
                <span className="text-slate-500">{e.location}</span>
              </div>
              {(e.summary || e.responsibilities?.filter(Boolean).length > 0) && (
                <div className="text-[11px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: e.summary?.includes('<') ? e.summary : normalizeToHtml(e.summary) + normalizeToHtml(e.responsibilities) }} />
              )}
            </div>
          ))}
        </Section>
      )}

      {skillGroups.length > 0 && (
        <Section title="Skills" accent={accent} style={sectionOrderStyle(data, "skills")}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {skillGroups.map((g) => (
              <div key={g.id}>
                <p className="text-[10.5px] font-semibold text-slate-800">{g.name}</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">{g.skills.join(", ")}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects" accent={accent} style={sectionOrderStyle(data, "projects")}>
          {projects.map((pr) => (
            <div key={pr.id} className="mb-2.5 last:mb-0 break-inside-avoid">
              <p className="text-[12px] font-semibold text-slate-900">{pr.name}</p>
              {(pr.description || pr.highlights?.filter(Boolean).length > 0) && (
                <div className="text-[11px] mt-0.5 text-slate-700 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: pr.description?.includes('<') ? pr.description : normalizeToHtml(pr.description) + normalizeToHtml(pr.highlights) }} />
              )}
              {pr.tools && <p className="text-[10.5px] mt-0.5" style={{ color: accent }}>{pr.tools}</p>}
            </div>
          ))}
        </Section>
      )}

      <div className="contents">
        {education.length > 0 && (
          <Section title="Education" accent={accent} style={sectionOrderStyle(data, "education")}>
            {education.map((ed) => (
              <div key={ed.id} className="mb-1.5 last:mb-0 break-inside-avoid">
                <p className="text-[11px] font-semibold text-slate-900">{ed.degree}</p>
                <p className="text-[10.5px] text-slate-600">{ed.institution}</p>
                <p className="text-[10px] text-slate-400">{ed.startDate}{(ed.startDate || ed.endDate) && " \u2013 "}{ed.endDate}{ed.grade && ` \u00b7 ${ed.grade}`}</p>
                {ed.description && (
                  <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(ed.description) }} />
                )}
              </div>
            ))}
          </Section>
        )}
        {certifications.length > 0 && (
          <Section title="Certifications" accent={accent} style={sectionOrderStyle(data, "certifications")}>
            {certifications.map((c) => (
              <div key={c.id} className="mb-1.5 last:mb-0 break-inside-avoid">
                <p className="text-[11px] font-semibold text-slate-900">{c.name}</p>
                <p className="text-[10.5px] text-slate-600">{c.organization} {c.issueDate && `\u00b7 ${c.issueDate}`}</p>
              </div>
            ))}
          </Section>
        )}
        {data.Languages?.length > 0 && (
          <Section title="Languages" accent={accent} style={sectionOrderStyle(data, "Languages")}>
            {data.Languages.map((l) => (
              <div key={l.id} className="mb-1 last:mb-0 break-inside-avoid">
                <p className="text-[10.5px] font-semibold text-slate-800">{l.name} <span className="text-slate-500 font-normal">{l.proficiency && `\u2014 ${l.proficiency}`}</span></p>
              </div>
            ))}
          </Section>
        )}
        {data.achievements?.length > 0 && (
          <Section title="Achievements" accent={accent} style={sectionOrderStyle(data, "achievements")}>
            {data.achievements.map((a) => (
              <div key={a.id} className="mb-2 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11.5px] font-semibold text-slate-900">{a.title}</span>
                  <span className="text-[10.5px] text-slate-500">{a.date}</span>
                </div>
                {a.organization && <p className="text-[10.5px] font-medium" style={{ color: accent }}>{a.organization}</p>}
                {a.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(a.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.links?.length > 0 && (
          <Section title="Links" accent={accent} style={sectionOrderStyle(data, "links")}>
            <div className="flex flex-wrap gap-x-4">
              {data.links.map((l) => (
                <a key={l.id} href={l.url} className="text-[10.5px] font-medium text-slate-700 hover:opacity-80" target="_blank" rel="noreferrer">
                  {l.platform}: <span style={{ color: accent }}>{l.url}</span>
                </a>
              ))}
            </div>
          </Section>
        )}
        {data.internships?.length > 0 && (
          <Section title="Internships" accent={accent} style={sectionOrderStyle(data, "internships")}>
            {data.internships.map((e) => (
              <div key={e.id} className="mb-3 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-semibold text-slate-900">{e.jobTitle}</span>
                  <span className="text-[10.5px] text-slate-500">{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
                </div>
                <div className="flex justify-between items-baseline text-[11.5px] mt-0.5" style={{ color: accent }}>
                  <span className="font-medium">{e.company}</span>
                  <span className="text-slate-500">{e.location}</span>
                </div>
                {e.summary && <div className="text-[11px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.summary) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.courses?.length > 0 && (
          <Section title="Courses" accent={accent} style={sectionOrderStyle(data, "courses")}>
            {data.courses.map((c) => (
              <div key={c.id} className="mb-2 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11.5px] font-semibold text-slate-900">{c.name}</span>
                  <span className="text-[10.5px] text-slate-500">{c.date}</span>
                </div>
                {(c.provider || c.url) && <p className="text-[10.5px] font-medium" style={{ color: accent }}>{c.provider}{c.url && ` \u00b7 ${c.url}`}</p>}
                {c.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(c.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.volunteering?.length > 0 && (
          <Section title="Volunteering" accent={accent} style={sectionOrderStyle(data, "volunteering")}>
            {data.volunteering.map((e) => (
              <div key={e.id} className="mb-3 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] font-semibold text-slate-900">{e.role}</span>
                  <span className="text-[10.5px] text-slate-500">{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
                </div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: accent }}>{e.organization}</div>
                {e.description && <div className="text-[11px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.publications?.length > 0 && (
          <Section title="Publications" accent={accent} style={sectionOrderStyle(data, "publications")}>
            {data.publications.map((p) => (
              <div key={p.id} className="mb-2 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11.5px] font-semibold text-slate-900">{p.title}</span>
                  <span className="text-[10.5px] text-slate-500">{p.date}</span>
                </div>
                {(p.publisher || p.url) && <p className="text-[10.5px] font-medium" style={{ color: accent }}>{p.publisher}{p.url && ` \u00b7 ${p.url}`}</p>}
                {p.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(p.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.interests?.length > 0 && (
          <Section title="Interests" accent={accent} style={sectionOrderStyle(data, "interests")}>
            <p className="text-[10.5px] text-slate-600 mb-0.5 break-inside-avoid">
              {data.interests.map(i => i.name).filter(Boolean).join(" \u2022 ")}
            </p>
          </Section>
        )}
        {data.customSection?.items?.length > 0 && (
          <Section title={data.customSection.sectionTitle || "Custom Section"} accent={accent} style={sectionOrderStyle(data, "customSection")}>
            {data.customSection.items.map((i) => (
              <div key={i.id} className="mb-2 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11.5px] font-semibold text-slate-900">{i.entryTitle}</span>
                  <span className="text-[10.5px] text-slate-500">{i.date}</span>
                </div>
                {i.url && <p className="text-[10.5px] font-medium" style={{ color: accent }}>{i.url}</p>}
                {i.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(i.description) }} />}
              </div>
            ))}
          </Section>
        )}
      </div>
      {(data.customFields || []).map((field) => (
        <CustomFieldSection key={field.id} field={field} variant="modern" style={sectionOrderStyle(data, customSectionKey(field.id))} />
      ))}
    </div>
  );

  function Section({ title, children, accent, style }) {
    return (
      <div className="mb-4" style={style}>
        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>{title}</h2>
        {children}
      </div>
    );
  }
}

function ResumeMinimal({ data, pageSettings }) {
  const { personal: p, summary, experience, skillGroups, projects, education, certifications } = data;
  return (
    <div id="resume-print-page" className="bg-white text-slate-700 flex flex-col" style={{ ...pageStyle(pageSettings), padding: "20mm 22mm" }}>
      <h1 className="text-[22px] font-light tracking-wide text-slate-900">{p.fullName}</h1>
      {p.title && <p className="text-[12px] mt-1 text-slate-500">{p.title}</p>}
      <ContactLine p={p} withIcons className="text-[10px] mt-2 text-slate-400" />

      {summary && (
        <Section title="Summary" style={sectionOrderStyle(data, "summary")}>
          <div className="text-[11px] leading-relaxed text-slate-600 resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(summary) }} />
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience" style={sectionOrderStyle(data, "experience")}>
          {experience.map((e) => (
            <div key={e.id} className="mb-4 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[12px] font-medium text-slate-900">{e.jobTitle}</span>
                <span className="text-[10px] text-slate-400">{e.startDate}{(e.startDate || e.endDate || e.current) && " \u2013 "}{e.current ? "Present" : e.endDate}</span>
              </div>
              <p className="text-[11px] text-slate-500">{e.company}{e.location && `, ${e.location}`}</p>
              {(e.summary || e.responsibilities?.filter(Boolean).length > 0) && (
                <div className="text-[10.5px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: e.summary?.includes('<') ? e.summary : normalizeToHtml(e.summary) + normalizeToHtml(e.responsibilities) }} />
              )}
            </div>
          ))}
        </Section>
      )}

      {skillGroups.length > 0 && (
        <Section title="Skills" style={sectionOrderStyle(data, "skills")}>
          {skillGroups.map((g) => (
            <p key={g.id} className="text-[10.5px] mb-1 text-slate-600 break-inside-avoid">
              <span className="text-slate-800">{g.name}</span> \u2014 {g.skills.join(", ")}
            </p>
          ))}
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects" style={sectionOrderStyle(data, "projects")}>
          {projects.map((pr) => (
            <div key={pr.id} className="mb-3 last:mb-0 break-inside-avoid">
              <p className="text-[11.5px] font-medium text-slate-900">{pr.name}</p>
              {(pr.description || pr.highlights?.filter(Boolean).length > 0) && (
                <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: pr.description?.includes('<') ? pr.description : normalizeToHtml(pr.description) + normalizeToHtml(pr.highlights) }} />
              )}
              {pr.tools && <p className="text-[10px] mt-0.5 text-slate-400">{pr.tools}</p>}
            </div>
          ))}
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education" style={sectionOrderStyle(data, "education")}>
          {education.map((ed) => (
            <div key={ed.id} className="mb-2 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="text-[11px] font-medium text-slate-900">{ed.degree}</p>
                  <p className="text-[10.5px] text-slate-500">{ed.institution}{ed.grade && ` \u00b7 ${ed.grade}`}</p>
                </div>
                <span className="text-[10px] text-slate-400">{ed.startDate}{(ed.startDate || ed.endDate) && " \u2013 "}{ed.endDate}</span>
              </div>
              {ed.description && (
                <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(ed.description) }} />
              )}
            </div>
          ))}
        </Section>
      )}

      {certifications.length > 0 && (
        <Section title="Certifications" style={sectionOrderStyle(data, "certifications")}>
          {certifications.map((c) => (
            <p key={c.id} className="text-[10.5px] mb-0.5 text-slate-600 break-inside-avoid">
              {c.name}{c.organization && ` \u2014 ${c.organization}`}{c.issueDate && `, ${c.issueDate}`}
            </p>
          ))}
        </Section>
      )}
      {data.Languages?.length > 0 && (
        <Section title="Languages" style={sectionOrderStyle(data, "Languages")}>
          {data.Languages.map((l) => (
            <div key={l.id} className="mb-0.5 last:mb-0 break-inside-avoid">
              <p className="text-[10.5px] text-slate-800">{l.name} <span className="text-slate-500 font-normal">{l.proficiency && `\u2014 ${l.proficiency}`}</span></p>
            </div>
          ))}
        </Section>
      )}
      {data.achievements?.length > 0 && (
        <Section title="Achievements" style={sectionOrderStyle(data, "achievements")}>
          {data.achievements.map((a) => (
            <div key={a.id} className="mb-2 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-medium text-slate-900">{a.title}</span>
                <span className="text-[10px] text-slate-400">{a.date}</span>
              </div>
              {a.organization && <p className="text-[10.5px] text-slate-500">{a.organization}</p>}
              {a.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(a.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.links?.length > 0 && (
        <Section title="Links" style={sectionOrderStyle(data, "links")}>
          <div className="flex flex-wrap gap-x-4">
            {data.links.map((l) => (
              <a key={l.id} href={l.url} className="text-[10.5px] font-normal text-slate-600 hover:text-slate-900" target="_blank" rel="noreferrer">
                <span className="font-medium">{l.platform}</span>: {l.url}
              </a>
            ))}
          </div>
        </Section>
      )}
      {data.internships?.length > 0 && (
        <Section title="Internships" style={sectionOrderStyle(data, "internships")}>
          {data.internships.map((e) => (
            <div key={e.id} className="mb-3 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[12px] font-medium text-slate-900">{e.jobTitle}</span>
                <span className="text-[10px] text-slate-400">{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
              </div>
              <p className="text-[11px] text-slate-500">{e.company}{e.location && `, ${e.location}`}</p>
              {e.summary && <div className="text-[10.5px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.summary) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.courses?.length > 0 && (
        <Section title="Courses" style={sectionOrderStyle(data, "courses")}>
          {data.courses.map((c) => (
            <div key={c.id} className="mb-2 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-medium text-slate-900">{c.name}</span>
                <span className="text-[10px] text-slate-400">{c.date}</span>
              </div>
              {(c.provider || c.url) && <p className="text-[10.5px] text-slate-500">{c.provider}{c.url && ` \u00b7 ${c.url}`}</p>}
              {c.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(c.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.volunteering?.length > 0 && (
        <Section title="Volunteering" style={sectionOrderStyle(data, "volunteering")}>
          {data.volunteering.map((e) => (
            <div key={e.id} className="mb-3 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[11.5px] font-medium text-slate-900">{e.role}</span>
                <span className="text-[10px] text-slate-400">{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
              </div>
              <div className="text-[10.5px] text-slate-500">{e.organization}</div>
              {e.description && <div className="text-[10.5px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.publications?.length > 0 && (
        <Section title="Publications" style={sectionOrderStyle(data, "publications")}>
          {data.publications.map((p) => (
            <div key={p.id} className="mb-2 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-medium text-slate-900">{p.title}</span>
                <span className="text-[10px] text-slate-400">{p.date}</span>
              </div>
              {(p.publisher || p.url) && <p className="text-[10.5px] text-slate-500">{p.publisher}{p.url && ` \u00b7 ${p.url}`}</p>}
              {p.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(p.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {data.interests?.length > 0 && (
        <Section title="Interests" style={sectionOrderStyle(data, "interests")}>
          <p className="text-[10.5px] text-slate-600 mb-0.5 break-inside-avoid">
            {data.interests.map(i => i.name).filter(Boolean).join(" \u2022 ")}
          </p>
        </Section>
      )}
      {data.customSection?.items?.length > 0 && (
        <Section title={data.customSection.sectionTitle || "Custom Section"} style={sectionOrderStyle(data, "customSection")}>
          {data.customSection.items.map((i) => (
            <div key={i.id} className="mb-2 last:mb-0 break-inside-avoid">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-medium text-slate-900">{i.entryTitle}</span>
                <span className="text-[10px] text-slate-400">{i.date}</span>
              </div>
              {i.url && <p className="text-[10.5px] text-slate-500">{i.url}</p>}
              {i.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(i.description) }} />}
            </div>
          ))}
        </Section>
      )}
      {(data.customFields || []).map((field) => (
        <CustomFieldSection key={field.id} field={field} variant="minimal" style={sectionOrderStyle(data, customSectionKey(field.id))} />
      ))}
    </div>
  );

  function Section({ title, children, style }) {
    return (
      <div className="mb-4 pt-3 border-t border-slate-100 first:border-t-0 first:pt-0" style={style}>
        <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] mb-2 text-slate-400">{title}</h2>
        {children}
      </div>
    );
  }
}

function ResumeProfessional({ data, pageSettings }) {
  const { personal: p, summary, experience, skillGroups, projects, education, certifications } = data;
  return (
    <div id="resume-print-page" className="bg-white text-slate-800 flex" style={pageStyle(pageSettings)}>
      <aside style={{ width: "68mm", padding: "16mm 8mm 16mm 14mm" }} className="bg-slate-50">
        <h1 className="text-[18px] font-bold leading-tight text-slate-900">{p.fullName}</h1>
        {p.title && <p className="text-[11px] mt-1 text-slate-600">{p.title}</p>}

        <ContactStack p={p} className="mt-4 space-y-1.5" />

        {skillGroups.length > 0 && (
          <div className="hidden mt-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Skills</h2>
            {skillGroups.map((g) => (
              <div key={g.id} className="mb-2.5 break-inside-avoid">
                <p className="text-[10px] font-semibold text-slate-800">{g.name}</p>
                <p className="text-[9.5px] text-slate-600 leading-snug mt-0.5">{g.skills.join(", ")}</p>
              </div>
            ))}
          </div>
        )}

        {education.length > 0 && (
          <div className="hidden mt-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Education</h2>
            {education.map((ed) => (
              <div key={ed.id} className="mb-2 last:mb-0 break-inside-avoid">
                <p className="text-[10px] font-semibold text-slate-800">{ed.degree}</p>
                <p className="text-[9.5px] text-slate-600">{ed.institution}</p>
                <p className="text-[9px] text-slate-400">{ed.startDate}{(ed.startDate || ed.endDate) && " \u2013 "}{ed.endDate}{ed.grade && ` \u00b7 ${ed.grade}`}</p>
              </div>
            ))}
          </div>
        )}

        {certifications.length > 0 && (
          <div className="hidden mt-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Certifications</h2>
            {certifications.map((c) => (
              <div key={c.id} className="mb-1.5 last:mb-0 break-inside-avoid">
                <p className="text-[9.5px] font-semibold text-slate-800">{c.name}</p>
                <p className="text-[9px] text-slate-500">{c.organization} {c.issueDate && `\u00b7 ${c.issueDate}`}</p>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="flex flex-col" style={{ width: "142mm", padding: "16mm 14mm 16mm 8mm" }}>
        {summary && (
          <Section title="Summary" style={sectionOrderStyle(data, "summary")}>
            <div className="text-[11px] leading-relaxed text-slate-700 resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(summary) }} />
          </Section>
        )}

        {experience.length > 0 && (
          <Section title="Experience" style={sectionOrderStyle(data, "experience")}>
            {experience.map((e) => (
              <div key={e.id} className="mb-3 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] font-semibold text-slate-900">{e.jobTitle}</span>
                  <span className="text-[10px] text-slate-500">{e.startDate}{(e.startDate || e.endDate || e.current) && " \u2013 "}{e.current ? "Present" : e.endDate}</span>
                </div>
                <p className="text-[10.5px] text-slate-600 italic">{e.company}{e.location && `, ${e.location}`}</p>
                {(e.summary || e.responsibilities?.filter(Boolean).length > 0) && (
                  <div className="text-[10.5px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: e.summary?.includes('<') ? e.summary : normalizeToHtml(e.summary) + normalizeToHtml(e.responsibilities) }} />
                )}
              </div>
            ))}
          </Section>
        )}

        {projects.length > 0 && (
          <Section title="Projects" style={sectionOrderStyle(data, "projects")}>
            {projects.map((pr) => (
              <div key={pr.id} className="mb-2.5 last:mb-0 break-inside-avoid">
                <p className="text-[11.5px] font-semibold text-slate-900">{pr.name}</p>
                {(pr.description || pr.highlights?.filter(Boolean).length > 0) && (
                  <div className="text-[10.5px] mt-0.5 text-slate-700 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: pr.description?.includes('<') ? pr.description : normalizeToHtml(pr.description) + normalizeToHtml(pr.highlights) }} />
                )}
                {pr.tools && <p className="text-[10px] italic mt-0.5 text-slate-500">Tools: {pr.tools}</p>}
              </div>
            ))}
          </Section>
        )}

        {skillGroups.length > 0 && (
          <Section title="Skills" style={sectionOrderStyle(data, "skills")}>
            {skillGroups.map((g) => (
              <div key={g.id} className="mb-2.5 break-inside-avoid">
                <p className="text-[10px] font-semibold text-slate-800">{g.name}</p>
                <p className="text-[9.5px] text-slate-600 leading-snug mt-0.5">{g.skills.join(", ")}</p>
              </div>
            ))}
          </Section>
        )}

        {education.length > 0 && (
          <Section title="Education" style={sectionOrderStyle(data, "education")}>
            {education.map((ed) => (
              <div key={ed.id} className="mb-2 last:mb-0 break-inside-avoid">
                <p className="text-[10px] font-semibold text-slate-800">{ed.degree}</p>
                <p className="text-[9.5px] text-slate-600">{ed.institution}</p>
                <p className="text-[9px] text-slate-400">{ed.startDate}{(ed.startDate || ed.endDate) && " \u2013 "}{ed.endDate}{ed.grade && ` \u00b7 ${ed.grade}`}</p>
                {ed.description && (
                  <div className="text-[9.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(ed.description) }} />
                )}
              </div>
            ))}
          </Section>
        )}

        {certifications.length > 0 && (
          <Section title="Certifications" style={sectionOrderStyle(data, "certifications")}>
            {certifications.map((c) => (
              <div key={c.id} className="mb-1.5 last:mb-0 break-inside-avoid">
                <p className="text-[9.5px] font-semibold text-slate-800">{c.name}</p>
                <p className="text-[9px] text-slate-500">{c.organization} {c.issueDate && `\u00b7 ${c.issueDate}`}</p>
              </div>
            ))}
          </Section>
        )}
        {data.Languages?.length > 0 && (
          <Section title="Languages" style={sectionOrderStyle(data, "Languages")}>
            {data.Languages.map((l) => (
              <div key={l.id} className="mb-0.5 last:mb-0 break-inside-avoid">
                <p className="text-[10px] text-slate-800 font-semibold">{l.name} <span className="text-slate-500 font-normal">{l.proficiency && `\u2014 ${l.proficiency}`}</span></p>
              </div>
            ))}
          </Section>
        )}
        {data.achievements?.length > 0 && (
          <Section title="Achievements" style={sectionOrderStyle(data, "achievements")}>
            {data.achievements.map((a) => (
              <div key={a.id} className="mb-2 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-semibold text-slate-900">{a.title}</span>
                  <span className="text-[10px] text-slate-500">{a.date}</span>
                </div>
                {a.organization && <p className="text-[10.5px] text-slate-600 italic">{a.organization}</p>}
                {a.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(a.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.links?.length > 0 && (
          <Section title="Links" style={sectionOrderStyle(data, "links")}>
            <div className="flex flex-wrap gap-x-4">
              {data.links.map((l) => (
                <a key={l.id} href={l.url} className="text-[10px] font-normal text-slate-600 hover:text-slate-900" target="_blank" rel="noreferrer">
                  <span className="font-semibold text-slate-800">{l.platform}</span>: {l.url}
                </a>
              ))}
            </div>
          </Section>
        )}
        {data.internships?.length > 0 && (
          <Section title="Internships" style={sectionOrderStyle(data, "internships")}>
            {data.internships.map((e) => (
              <div key={e.id} className="mb-3 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] font-semibold text-slate-900">{e.jobTitle}</span>
                  <span className="text-[10px] text-slate-500">{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
                </div>
                <p className="text-[10.5px] text-slate-600 italic">{e.company}{e.location && `, ${e.location}`}</p>
                {e.summary && <div className="text-[10.5px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.summary) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.courses?.length > 0 && (
          <Section title="Courses" style={sectionOrderStyle(data, "courses")}>
            {data.courses.map((c) => (
              <div key={c.id} className="mb-2 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-semibold text-slate-900">{c.name}</span>
                  <span className="text-[10px] text-slate-500">{c.date}</span>
                </div>
                {(c.provider || c.url) && <p className="text-[10.5px] text-slate-600 italic">{c.provider}{c.url && ` \u00b7 ${c.url}`}</p>}
                {c.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(c.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.volunteering?.length > 0 && (
          <Section title="Volunteering" style={sectionOrderStyle(data, "volunteering")}>
            {data.volunteering.map((e) => (
              <div key={e.id} className="mb-3 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11.5px] font-semibold text-slate-900">{e.role}</span>
                  <span className="text-[10px] text-slate-500">{e.startDate}{(e.startDate || e.endDate) && " \u2013 "}{e.endDate}</span>
                </div>
                <div className="text-[10.5px] text-slate-600 italic">{e.organization}</div>
                {e.description && <div className="text-[10.5px] mt-1 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(e.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.publications?.length > 0 && (
          <Section title="Publications" style={sectionOrderStyle(data, "publications")}>
            {data.publications.map((p) => (
              <div key={p.id} className="mb-2 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-semibold text-slate-900">{p.title}</span>
                  <span className="text-[10px] text-slate-500">{p.date}</span>
                </div>
                {(p.publisher || p.url) && <p className="text-[10.5px] text-slate-600 italic">{p.publisher}{p.url && ` \u00b7 ${p.url}`}</p>}
                {p.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(p.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {data.interests?.length > 0 && (
          <Section title="Interests" style={sectionOrderStyle(data, "interests")}>
            <p className="text-[10px] text-slate-800 font-semibold mb-0.5 break-inside-avoid">
              {data.interests.map(i => i.name).filter(Boolean).join(" \u2022 ")}
            </p>
          </Section>
        )}
        {data.customSection?.items?.length > 0 && (
          <Section title={data.customSection.sectionTitle || "Custom Section"} style={sectionOrderStyle(data, "customSection")}>
            {data.customSection.items.map((i) => (
              <div key={i.id} className="mb-2 last:mb-0 break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-semibold text-slate-900">{i.entryTitle}</span>
                  <span className="text-[10px] text-slate-500">{i.date}</span>
                </div>
                {i.url && <p className="text-[10px] text-slate-600 italic">{i.url}</p>}
                {i.description && <div className="text-[10.5px] mt-0.5 text-slate-600 leading-snug resume-richtext" dangerouslySetInnerHTML={{ __html: normalizeToHtml(i.description) }} />}
              </div>
            ))}
          </Section>
        )}
        {(data.customFields || []).map((field) => (
          <CustomFieldSection key={field.id} field={field} variant="professional" style={sectionOrderStyle(data, customSectionKey(field.id))} />
        ))}
      </main>
    </div>
  );

  function Section({ title, children }) {
    return (
      <div className="mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-800 border-b border-slate-300 pb-1 mb-2">{title}</h2>
        {children}
      </div>
    );
  }
}

const TEMPLATE_COMPONENTS = {
  ats: ResumeATS,
  modern: ResumeModern,
  minimal: ResumeMinimal,
  professional: ResumeProfessional,
};

/* ---------------------------------------------------------------------- */
/* Templates panel                                                         */
/* ---------------------------------------------------------------------- */

function TemplatesPanel({ current, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Choose a template</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5">
          {TEMPLATES.map((t) => {
            const active = t.id === current;
            return (
              <div
                key={t.id}
                className={`rounded-lg border p-3 ${active ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200"}`}
              >
                <div className="h-28 rounded-md bg-slate-50 border border-slate-100 mb-3 flex items-center justify-center overflow-hidden">
                  <TemplateThumb id={t.id} />
                </div>
                <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">{t.blurb}</p>
                <button
                  onClick={() => onSelect(t.id)}
                  className={`w-full text-xs font-medium rounded-md py-1.5 ${active ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {active ? "In use" : "Use template"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TemplateThumb({ id }) {
  if (id === "professional") {
    return (
      <div className="w-16 h-20 bg-white border border-slate-200 flex">
        <div className="w-5 h-full bg-slate-300" />
        <div className="flex-1 p-1 space-y-1">
          <div className="h-1.5 w-8 bg-slate-400 rounded-sm" />
          <div className="h-1 w-10 bg-slate-200 rounded-sm" />
          <div className="h-1 w-9 bg-slate-200 rounded-sm" />
        </div>
      </div>
    );
  }
  const accent = id === "modern" ? "bg-teal-400" : id === "minimal" ? "bg-slate-200" : "bg-slate-700";
  return (
    <div className="w-16 h-20 bg-white border border-slate-200 p-1.5 space-y-1">
      <div className={`h-1.5 w-9 rounded-sm ${accent}`} />
      <div className="h-1 w-11 bg-slate-200 rounded-sm" />
      <div className="h-1 w-10 bg-slate-200 rounded-sm mt-1.5" />
      <div className="h-1 w-11 bg-slate-100 rounded-sm" />
      <div className="h-1 w-8 bg-slate-100 rounded-sm" />
    </div>
  );
}

function PageSizeControls({ settings, onChange }) {
  const pageSettings = normalizePageSettings(settings);
  const setDimension = (key, value) => {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0 && number <= 1000) onChange({ [key]: number });
  };
  const setUnit = (unit) => {
    const currentUnit = PAGE_UNITS[pageSettings.customUnit];
    const nextUnit = PAGE_UNITS[unit];
    onChange({
      customUnit: unit,
      customWidth: +(pageSettings.customWidth * currentUnit / nextUnit).toFixed(2),
      customHeight: +(pageSettings.customHeight * currentUnit / nextUnit).toFixed(2),
    });
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <span className="sr-only">Page size</span>
        <select value={pageSettings.size} onChange={(event) => onChange({ size: event.target.value })} className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="a4">A4</option>
          <option value="a5">A5</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <span className="sr-only">Orientation</span>
        <select value={pageSettings.orientation} onChange={(event) => onChange({ orientation: event.target.value })} className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </label>
      {pageSettings.size === "custom" && (
        <div className="flex items-center gap-1">
          <label className="sr-only" htmlFor="custom-page-width">Custom width</label>
          <input id="custom-page-width" type="number" min="1" max="1000" step="0.1" value={pageSettings.customWidth} onChange={(event) => setDimension("customWidth", event.target.value)} className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <span className="text-xs text-slate-400">x</span>
          <label className="sr-only" htmlFor="custom-page-height">Custom height</label>
          <input id="custom-page-height" type="number" min="1" max="1000" step="0.1" value={pageSettings.customHeight} onChange={(event) => setDimension("customHeight", event.target.value)} className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <label className="sr-only" htmlFor="custom-page-unit">Custom page unit</label>
          <select id="custom-page-unit" value={pageSettings.customUnit} onChange={(event) => setUnit(event.target.value)} className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Preview panel                                                           */
/* ---------------------------------------------------------------------- */

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { margin: 16mm 18mm; }
        #resume-print-page { padding: 0 !important; width: 100% !important; min-height: auto !important; }
      }
      .resume-richtext ul { list-style-type: disc; padding-left: 1.5em; margin-top: 0.25em; margin-bottom: 0.25em; }
      .resume-richtext ol { list-style-type: decimal; padding-left: 1.5em; margin-top: 0.25em; margin-bottom: 0.25em; }
      .resume-richtext p { margin-top: 0.25em; margin-bottom: 0.25em; white-space: pre-wrap; }
      .resume-richtext h1 { font-size: 1.25em; font-weight: bold; margin-top: 0.5rem; margin-bottom: 0.25rem; white-space: pre-wrap; }
      .resume-richtext h2 { font-size: 1.1em; font-weight: bold; margin-top: 0.4rem; margin-bottom: 0.2rem; white-space: pre-wrap; }
      .resume-richtext li > p { margin: 0; display: inline; }
      .resume-richtext a { text-decoration: underline; color: inherit; }
      .resume-richtext blockquote { border-left: 2px solid currentColor; padding-left: 0.75em; opacity: 0.8; font-style: italic; margin-top: 0.5em; margin-bottom: 0.5em; }
      .resume-richtext hr { border: none; border-top: 1px solid currentColor; opacity: 0.3; margin: 0.8em 0; }
      .resume-richtext > *:first-child { margin-top: 0; }
      .resume-richtext > *:last-child { margin-bottom: 0; }
    `}</style>
  );
}

function PreviewPanel({ data, template, onPageSettingsChange }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.8);
  const dimensions = pageDimensions(data.pageSettings);

  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pageWidthPx = (dimensions.width / 25.4) * 96;
    const available = el.clientWidth - 32;
    const next = Math.max(0.35, Math.min(1.4, available / pageWidthPx));
    setScale(next);
  }, [dimensions.width]);

  useEffect(() => {
    fitToScreen();
    const onResize = () => fitToScreen();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitToScreen]);

  const TemplateComp = TEMPLATE_COMPONENTS[template] || ResumeATS;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="resume-preview-toolbar flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 px-4 py-2 bg-white shrink-0">
        <span className="text-xs font-medium text-slate-500">Live preview</span>
        <PageSizeControls settings={data.pageSettings} onChange={onPageSettingsChange} />
        <div className="flex items-center gap-1">
          <IconBtn title="Zoom out" onClick={() => setScale((s) => Math.max(0.35, +(s - 0.1).toFixed(2)))}>
            <ZoomOut size={13} />
          </IconBtn>
          <span className="text-xs text-slate-500 w-10 text-center">{Math.round(scale * 100)}%</span>
          <IconBtn title="Zoom in" onClick={() => setScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}>
            <ZoomIn size={13} />
          </IconBtn>
          <IconBtn title="Fit to screen" onClick={fitToScreen}>
            <Maximize2 size={13} />
          </IconBtn>
        </div>
      </div>
      <div ref={containerRef} className="resume-preview-scroll flex-1 min-h-0 overflow-auto bg-slate-100 py-6">
        <div className="resume-preview-layout" style={{ width: `calc(${dimensions.width}mm * ${scale})`, margin: "0 auto" }}>
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${dimensions.width}mm` }}
            className="resume-screen-scale shadow-md"
          >
            <PrintStyles />
            <TemplateComp data={data} pageSettings={data.pageSettings} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main App                                                                */
/* ---------------------------------------------------------------------- */

const SECTIONS = [
  { key: "summary", label: "Professional summary" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "education", label: "Education" },
  { key: "certifications", label: "Certifications" },
  { key: "Languages", label: "Languages" },
  { key: "achievements", label: "Achievements & Awards" },
  { key: "links", label: "Professional Links" },
  { key: "internships", label: "Internships" },
  { key: "courses", label: "Training & Courses" },
  { key: "volunteering", label: "Volunteer Experience" },
  { key: "publications", label: "Publications" },
  { key: "interests", label: "Interests" },
  { key: "customSection", label: "Custom Section" },
];

export default function App() {
  const [data, setData] = useState(defaultData());
  const [template, setTemplate] = useState("ats");
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [showTemplates, setShowTemplates] = useState(false);
  const [mobileTab, setMobileTab] = useState("edit");
  const [openSections, setOpenSections] = useState({ personal: true });
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await readResumeStorage();
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed.data) {
            const customFields = Array.isArray(parsed.data.customFields) ? parsed.data.customFields : [];
            setData({ ...parsed.data, customFields, sectionOrder: normalizeSectionOrder(parsed.data.sectionOrder, customFields), pageSettings: normalizePageSettings(parsed.data.pageSettings) });
          }
          if (parsed.template) setTemplate(parsed.template);
        }
      } catch (e) {
        /* no saved data yet */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveStatus("Saving...");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await writeResumeStorage(JSON.stringify({ data, template }));
        setSaveStatus("Saved");
      } catch (e) {
        setSaveStatus("Save failed");
      }
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [data, template, loaded]);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const updatePageSettings = (patch) => update({ pageSettings: normalizePageSettings({ ...data.pageSettings, ...patch }) });

  const toggleSection = (key) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const handleDownload = () => {
    const prevTitle = document.title;
    const fname = `${fileSafe(data.personal.fullName) || "Resume"}_${fileSafe(data.personal.title.split("|")[0]) || "Resume"}_Resume`;
    document.title = fname;
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        document.title = prevTitle;
      }, 500);
    }, 50);
  };

  const orderedSections = normalizeSectionOrder(data.sectionOrder, data.customFields).map((key) => {
    const section = SECTIONS.find((item) => item.key === key);
    if (section) return section;
    const field = (data.customFields || []).find((item) => customSectionKey(item.id) === key);
    return field ? { key, label: field.title || "New custom field", customField: field } : null;
  }).filter(Boolean);

  const addCustomField = () => {
    const field = { id: uid("custom"), title: "", description: "", bullets: [] };
    update({ customFields: [...(data.customFields || []), field], sectionOrder: [...normalizeSectionOrder(data.sectionOrder, data.customFields), customSectionKey(field.id)] });
    setOpenSections((sections) => ({ ...sections, [customSectionKey(field.id)]: true }));
  };

  const updateCustomField = (id, patch) => update({ customFields: (data.customFields || []).map((field) => field.id === id ? { ...field, ...patch } : field) });
  const deleteCustomField = (id) => update({ customFields: (data.customFields || []).filter((field) => field.id !== id), sectionOrder: normalizeSectionOrder(data.sectionOrder, data.customFields).filter((key) => key !== customSectionKey(id)) });

  const editorPane = (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-3">
      <CollapsibleSection
        title="Personal information"
        open={!!openSections.personal}
        onToggle={() => toggleSection("personal")}
      >
        <PersonalEditor data={data} update={update} />
      </CollapsibleSection>
      <SortableSectionList
        items={orderedSections}
        onReorder={(next) => update({ sectionOrder: next.map((section) => section.key) })}
        renderItem={(s, index, drag) => (
          <CollapsibleSection
            key={s.key}
            title={s.label}
            open={!!openSections[s.key]}
            onToggle={() => toggleSection(s.key)}
            dragHandle={drag.handle}
            dragging={drag.dragging}
          >
            {s.customField ? (
              <CustomFieldCard
                field={s.customField}
                onChange={(patch) => updateCustomField(s.customField.id, patch)}
                onDelete={() => deleteCustomField(s.customField.id)}
                drag={undefined}
              />
            ) : (
              <>
                {s.key === "summary" && <SummaryEditor data={data} update={update} />}
                {s.key === "experience" && <ExperienceEditor data={data} update={update} />}
                {s.key === "skills" && <SkillsEditor data={data} update={update} />}
                {s.key === "projects" && <ProjectsEditor data={data} update={update} />}
                {s.key === "education" && <EducationEditor data={data} update={update} />}
                {s.key === "certifications" && <CertificationsEditor data={data} update={update} />}
                {s.key === "Languages" && <LanguagesEditor data={data} update={update} />}
                {s.key === "achievements" && <AchievementsEditor data={data} update={update} />}
                {s.key === "links" && <LinksEditor data={data} update={update} />}
                {s.key === "internships" && <InternshipsEditor data={data} update={update} />}
                {s.key === "courses" && <CoursesEditor data={data} update={update} />}
                {s.key === "volunteering" && <VolunteeringEditor data={data} update={update} />}
                {s.key === "publications" && <PublicationsEditor data={data} update={update} />}
                {s.key === "interests" && <InterestsEditor data={data} update={update} />}
                {s.key === "customSection" && <CustomSectionEditor data={data} update={update} />}
              </>
            )}
          </CollapsibleSection>
        )}
      />
      <button
        type="button"
        onClick={addCustomField}
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
      >
        <Plus size={14} /> Add Custom Field
      </button>
      <div className="h-4" />
    </div>
  );

  const previewPane = <PreviewPanel data={data} template={template} onPageSettingsChange={updatePageSettings} />;

  return (
    <div className="resume-app-shell h-screen flex flex-col bg-slate-50" style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .resume-app-shell { display: block !important; height: auto !important; min-height: 0 !important; }
          .resume-app-shell > header,
          .resume-app-shell > button,
          .resume-editor-pane,
          .resume-preview-toolbar { display: none !important; }
          .resume-workspace,
          .resume-preview-pane { display: block !important; width: auto !important; height: auto !important; min-height: 0 !important; }
          .resume-preview-scroll { display: block !important; width: auto !important; height: auto !important; min-height: 0 !important; padding: 0 !important; overflow: visible !important; background: transparent !important; }
          .resume-preview-layout, .resume-preview-layout * { visibility: visible !important; }
          .resume-preview-layout {
            position: static !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .resume-screen-scale {
            position: static !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            transform: none !important;
            box-shadow: none !important;
          }
          #resume-print-page {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            width: ${pageDimensions(data.pageSettings).width}mm !important;
            min-height: ${pageDimensions(data.pageSettings).height}mm !important;
            height: auto !important;
            margin: 0 !important;
            transform: none !important;
            box-shadow: none !important;
          }
          @page { size: ${pageDimensions(data.pageSettings).width}mm ${pageDimensions(data.pageSettings).height}mm; margin: 0; }
        }
      `}</style>

      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-teal-600 flex items-center justify-center">
            <FileText size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Resume Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400 mr-1">
            {saveStatus === "Saved" && <Check size={12} className="text-teal-600" />}
            {saveStatus}
          </span>
          <button
            onClick={() => setShowTemplates(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
          >
            <LayoutTemplate size={13} /> Templates
          </button>
          <button
            onClick={() => setMobileTab((t) => (t === "edit" ? "preview" : "edit"))}
            className="sm:hidden inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
          >
            <Eye size={13} /> {mobileTab === "edit" ? "Preview" : "Edit"}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-teal-600 rounded-md px-3 py-1.5 hover:bg-teal-700"
          >
            <Download size={13} /> Download PDF
          </button>
        </div>
      </header>

      <button
        onClick={() => setShowTemplates(true)}
        className="sm:hidden flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 border-b border-slate-200 bg-white py-2"
      >
        <LayoutTemplate size={13} /> Templates
      </button>

      <div className="resume-workspace flex-1 min-h-0 flex">
        <div className={`resume-editor-pane w-full sm:w-[42%] sm:max-w-[560px] border-r border-slate-200 bg-white ${mobileTab === "edit" ? "block" : "hidden"} sm:block min-h-0`}>
          {editorPane}
        </div>
        <div className={`resume-preview-pane flex-1 min-h-0 ${mobileTab === "preview" ? "block" : "hidden"} sm:block`}>
          {previewPane}
        </div>
      </div>

      {showTemplates && (
        <TemplatesPanel
          current={template}
          onSelect={(id) => {
            setTemplate(id);
            setShowTemplates(false);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
