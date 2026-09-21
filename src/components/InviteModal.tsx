import React, { useState } from 'react';
import { SpyGame } from '../types.ts';
import { generateInviteLink, addBotOperative } from '../utils/gameStorage.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import {
  Copy,
  Check,
  Share2,
  Mail,
  ExternalLink,
  X,
  UserPlus,
  Terminal,
} from 'lucide-react';

interface InviteModalProps {
  game: SpyGame;
  onClose: () => void;
  onOperativeAdded?: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ game, onClose, onOperativeAdded }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [simulatedAdded, setSimulatedAdded] = useState(false);

  const inviteUrl = generateInviteLink(game.id);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.getElementById('invite-url-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(game.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `[TOP SECRET] Invitation to ${game.title}`,
          text: `Operative, you have been summoned to join ${game.title}. Mission Code: ${game.inviteCode}`,
          url: inviteUrl,
        });
      } catch (err) {
        console.log('Share canceled or not supported', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`[CLASSIFIED] Operative Invitation: ${game.title}`);
    const body = encodeURIComponent(
      `OPERATIVE DISPATCH:\n\n` +
      `You have been summoned to participate in ${game.title}.\n` +
      `Mission Code: ${game.inviteCode}\n` +
      `Host Operative: ${game.hostCodename} (@${game.hostUsername})\n` +
      `Location Pool: 500 Pre-existing Places (Classified Upon Launch)\n\n` +
      `Access the encrypted terminal link to join:\n${inviteUrl}\n\n` +
      `Eyes only. Protocol 409.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSimulateJoin = () => {
    const updated = addBotOperative(game.id);
    if (updated) {
      setSimulatedAdded(true);
      setTimeout(() => setSimulatedAdded(false), 2000);
      if (onOperativeAdded) onOperativeAdded();
    }
  };

  return (
    <div
      id="invite-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="invite-modal-card"
        className="w-full max-w-md bg-neutral-900 border border-emerald-500/40 rounded-xl p-6 shadow-2xl text-neutral-100 relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          id="btn-close-invite-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
                {t('secure_transmission')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">{t('send_invite_link')}</h3>
          </div>
        </div>

        <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
          {t('share_link_desc', { title: game.title })}
        </p>

        {/* Invite Link Display Box */}
        <div className="mb-4">
          <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 font-medium tracking-wide">
            {t('classified_invitation_url')}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="invite-url-input"
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full bg-neutral-950 border border-neutral-750 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 select-all outline-none focus:border-emerald-500 truncate"
              />
            </div>
            <button
              id="btn-copy-invite-link"
              type="button"
              onClick={handleCopyLink}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-neutral-950'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('copied_excl')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t('copy_btn')}</span>
                </>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] text-emerald-400 mt-1.5 font-mono flex items-center gap-1">
              <Check className="w-3 h-3" />
              {t('link_copied_notice')}
            </p>
          )}
        </div>

        {/* Mission Code Badge */}
        <div className="mb-5 p-3 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-neutral-500">{t('direct_code_label')}</div>
            <div className="text-base font-bold font-mono tracking-widest text-white">{game.inviteCode}</div>
          </div>
          <button
            id="btn-copy-code"
            type="button"
            onClick={handleCopyCode}
            className="text-xs font-mono px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCode ? t('copied') : t('copy_code_btn')}</span>
          </button>
        </div>

        {/* Share Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <button
            id="btn-share-native"
            type="button"
            onClick={handleNativeShare}
            className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('share_link_btn')}</span>
          </button>

          <button
            id="btn-share-email"
            type="button"
            onClick={handleEmailShare}
            className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('send_email_btn')}</span>
          </button>
        </div>

        {/* Quick Test / Multi-tab helpers */}
        <div className="pt-4 border-t border-neutral-800">
          <div className="text-[10px] font-mono text-neutral-500 mb-2 flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            <span>{t('testing_simulation')}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <a
              id="link-open-new-tab"
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-3 rounded bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-[11px] font-mono text-neutral-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3 h-3 text-emerald-400" />
              <span>{t('open_new_tab')}</span>
            </a>

            <button
              id="btn-simulate-join"
              type="button"
              onClick={handleSimulateJoin}
              disabled={game.players.length >= game.maxPlayers}
              className="flex-1 py-1.5 px-3 rounded bg-neutral-850 hover:bg-neutral-800 disabled:opacity-40 border border-neutral-750 text-[11px] font-mono text-neutral-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3 h-3 text-emerald-400" />
              <span>{simulatedAdded ? t('added_agent') : t('add_bot_agent')}</span>
            </button>
          </div>
        </div>

        {/* Dismiss */}
        <div className="mt-5">
          <button
            id="btn-done-invite"
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
};
