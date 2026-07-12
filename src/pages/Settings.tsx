import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, Volume2, Smartphone, Clock, Lightbulb, Layers, Hash } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { setLanguage } from '../i18n';
import type { GameSettings as GameSettingsType } from '../types/generated';
import type { UISettings } from '../types';

const SETTINGS_KEY = 'sudokucalm-settings';

function loadUISettings(): UISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.ui) return parsed.ui;
    }
  } catch { /* ignore */ }
  return { sound: false, haptics: false };
}

function saveUISettings(ui: UISettings) {
  try {
    const existing = localStorage.getItem(SETTINGS_KEY);
    const data = existing ? JSON.parse(existing) : {};
    data.ui = ui;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function loadGameSettings(): GameSettingsType {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.game) return parsed.game;
    }
  } catch { /* ignore */ }
  return { show_timer: true, show_hints: true, highlight_areas: true, highlight_numbers: true };
}

function saveGameSettings(settings: GameSettingsType) {
  try {
    const existing = localStorage.getItem(SETTINGS_KEY);
    const data = existing ? JSON.parse(existing) : {};
    data.game = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

const GAME_TOGGLES: {
  key: keyof GameSettingsType;
  icon: React.ReactNode;
  labelKey: string;
  descKey: string;
}[] = [
  { key: 'show_timer', icon: <Clock size={20} />, labelKey: 'gameSettings.showTimer', descKey: 'gameSettings.showTimer_desc' },
  { key: 'show_hints', icon: <Lightbulb size={20} />, labelKey: 'gameSettings.showHints', descKey: 'gameSettings.showHints_desc' },
  { key: 'highlight_areas', icon: <Layers size={20} />, labelKey: 'gameSettings.highlightAreas', descKey: 'gameSettings.highlightAreas_desc' },
  { key: 'highlight_numbers', icon: <Hash size={20} />, labelKey: 'gameSettings.highlightNumbers', descKey: 'gameSettings.highlightNumbers_desc' },
];

export function Settings() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [uiSettings, setUiSettings] = useState(loadUISettings);
  const [gameSettings, setGameSettings] = useState(loadGameSettings);
  const engine = useGameEngine();

  useEffect(() => {
    saveUISettings(uiSettings);
  }, [uiSettings]);

  const updateGameSetting = (key: keyof GameSettingsType, value: boolean) => {
    setGameSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveGameSettings(next);
      engine.dispatch?.({ type: 'updateGameSettings', settings: next });
      return next;
    });
  };

  const currentLang = i18n.language?.startsWith('zh') ? 'zh' : 'en';

  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-ink-dark">{t('settings.title')}</h2>
      </div>

      {/* Language */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-ink-mid uppercase tracking-wider mb-1 px-1">
          {t('settings.language')}
        </h3>
        <div className="bg-bg-board rounded-xl overflow-hidden">
          <button
            onClick={() => {
              const next = currentLang === 'en' ? 'zh' : 'en';
              setLanguage(next);
            }}
            className="flex items-center justify-between w-full px-4 py-3.5
                       hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-primary" />
              <span className="text-sm font-medium text-ink-dark">
                {currentLang === 'en' ? 'English' : '中文'}
              </span>
            </div>
            <span className="text-xs text-ink-mid bg-white px-2 py-0.5 rounded-full">
              {currentLang === 'en' ? 'EN' : '中文'}
            </span>
          </button>
        </div>
      </div>

      {/* Game Settings toggles */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-ink-mid uppercase tracking-wider mb-1 px-1">
          {t('gameSettings.title')}
        </h3>
        <div className="bg-bg-board rounded-xl divide-y divide-border overflow-hidden">
          {GAME_TOGGLES.map(({ key, icon, labelKey, descKey }) => (
            <label
              key={key}
              className="flex items-center justify-between px-4 py-3.5 cursor-pointer
                         hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-primary">{icon}</span>
                <div>
                  <div className="text-sm font-medium text-ink-dark">{t(labelKey)}</div>
                  <div className="text-xs text-ink-mid">{t(descKey)}</div>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={gameSettings[key]}
                onClick={() => updateGameSetting(key, !gameSettings[key])}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full
                  transition-colors duration-200 flex-shrink-0
                  ${gameSettings[key] ? 'bg-primary' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 rounded-full bg-white shadow-sm
                    transform transition-transform duration-200
                    ${gameSettings[key] ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Sound & Haptics */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-ink-mid uppercase tracking-wider mb-1 px-1"></h3>
        <div className="bg-bg-board rounded-xl divide-y divide-border overflow-hidden">
          <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Volume2 size={20} className="text-primary" />
              <div>
                <div className="text-sm font-medium text-ink-dark">{t('settings.sound')}</div>
                <div className="text-xs text-ink-mid">{t('settings.sound_desc')}</div>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={uiSettings.sound}
              onClick={() => setUiSettings((s) => ({ ...s, sound: !s.sound }))}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200 flex-shrink-0
                ${uiSettings.sound ? 'bg-primary' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow-sm
                  transform transition-transform duration-200
                  ${uiSettings.sound ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </label>

          <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-primary" />
              <div>
                <div className="text-sm font-medium text-ink-dark">{t('settings.haptics')}</div>
                <div className="text-xs text-ink-mid">{t('settings.haptics_desc')}</div>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={uiSettings.haptics}
              onClick={() => setUiSettings((s) => ({ ...s, haptics: !s.haptics }))}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200 flex-shrink-0
                ${uiSettings.haptics ? 'bg-primary' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow-sm
                  transform transition-transform duration-200
                  ${uiSettings.haptics ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </label>
        </div>
      </div>

      {/* About */}
      <div className="mt-10 pt-4 border-t border-border">
        <p className="text-xs text-ink-mid text-center">{t('settings.about')}</p>
      </div>
    </div>
  );
}
