import React from "react";
import { UserProfile, ProficiencyLevel, LearningInterest } from "../types";
import { Globe, Settings, Award, Sparkles, BookOpen } from "lucide-react";

interface ProfileSelectorProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}

const NATIVE_LANGUAGES = [
  { code: "Arabic", label: "العربية (Arabic)" },
  { code: "English", label: "English (الإنجليزية)" },
  { code: "French", label: "Français (الفرنسية)" },
  { code: "Spanish", label: "Español (الإسبانية)" },
];

const TARGET_LANGUAGES = [
  { code: "English", label: "English (الإنجليزية)", flag: "🇺🇸" },
  { code: "French", label: "Français (الفرنسية)", flag: "🇫🇷" },
  { code: "Spanish", label: "Español (الإسبانية)", flag: "🇪🇸" },
  { code: "German", label: "Deutsch (الألمانية)", flag: "🇩🇪" },
  { code: "Japanese", label: "日本語 (اليابانية)", flag: "🇯🇵" },
  { code: "Italian", label: "Italiano (الإيطالية)", flag: "🇮🇹" },
  { code: "Turkish", label: "Türkçe (التركية)", flag: "🇹🇷" },
  { code: "Arabic", label: "العربية (Arabic)", flag: "🇸🇦" },
];

const LEVELS: { value: ProficiencyLevel; label: string; desc: string }[] = [
  { value: "Beginner (A1)", label: "مبتدئ (A1)", desc: "عبارات أساسية وكلمات شائعة جدًا" },
  { value: "Elementary (A2)", label: "مبتدئ متقدم (A2)", desc: "جمل بسيطة وحوارات يومية أساسية" },
  { value: "Intermediate (B1)", label: "متوسط (B1)", desc: "التعبير عن الأفكار، الآراء والمشاريع" },
  { value: "Upper-Intermediate (B2)", label: "متوسط مرتفع (B2)", desc: "فهم النصوص المعقدة والمناقشة بطلاقة" },
  { value: "Advanced (C1)", label: "متقدم (C1)", desc: "استخدام مرن وتلقائي للغة والتعبيرات المجازية" },
];

const INTERESTS: { value: LearningInterest; label: string; icon: string }[] = [
  { value: "travel", label: "السفر والسياحة", icon: "✈️" },
  { value: "business", label: "العمل والمعاملات التجارية", icon: "💼" },
  { value: "casual", label: "المحادثة اليومية الودية", icon: "🗣️" },
  { value: "academic", label: "الدراسة والبحث العلمي", icon: "🎓" },
  { value: "literature", label: "الأدب، الثقافة والفنون", icon: "🎨" },
  { value: "tech", label: "التكنولوجيا والعلوم", icon: "💻" },
  { value: "daily_life", label: "الحياة اليومية والتسوق", icon: "🛒" },
];

export default function ProfileSelector({ profile, onChange }: ProfileSelectorProps) {
  const updateField = (field: keyof UserProfile, value: any) => {
    onChange({ ...profile, [field]: value });
  };

  return (
    <div id="profile-selector-card" className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Settings className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <h2 className="font-sans font-semibold text-slate-800 text-lg">بصمتك التعليمية الشخصية</h2>
          <p className="text-xs text-slate-500">خصص المحتوى والذكاء الاصطناعي بناءً على هويتك</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Native Language Select */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            لغتك الأم (لغة الشرح):
          </label>
          <select
            value={profile.nativeLanguage}
            onChange={(e) => updateField("nativeLanguage", e.target.value)}
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700"
          >
            {NATIVE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target Language Select */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
            اللغة التي تريد تعلمها:
          </label>
          <select
            value={profile.targetLanguage}
            onChange={(e) => updateField("targetLanguage", e.target.value)}
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-700 font-medium"
          >
            {TARGET_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Proficiency levels */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          مستواك الحالي في اللغة المستهدفة:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {LEVELS.map((lvl) => {
            const isSelected = profile.level === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                id={`btn-level-${lvl.value.replace(/\s+/g, '-')}`}
                onClick={() => updateField("level", lvl.value)}
                className={`text-right p-3 rounded-xl border text-xs transition-all flex flex-col justify-between h-20 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-600/10"
                    : "border-slate-150 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="font-bold">{lvl.label}</span>
                <span className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-snug">{lvl.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Personal Interests */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          اهتماماتك وغايتك الرئيسية من التعلم:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {INTERESTS.map((interest) => {
            const isSelected = profile.interests === interest.value;
            return (
              <button
                key={interest.value}
                type="button"
                id={`btn-interest-${interest.value}`}
                onClick={() => updateField("interests", interest.value)}
                className={`p-2.5 rounded-xl border text-xs transition-all flex flex-col items-center justify-center gap-1.5 text-center ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-600/10"
                    : "border-slate-150 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="text-lg">{interest.icon}</span>
                <span className="font-medium text-[11px]">{interest.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
