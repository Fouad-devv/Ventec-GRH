import { useState } from 'react';
import {
  MdDashboard, MdWork, MdAccountTree, MdPeople, MdEmail,
  MdEventNote, MdFolder, MdNotifications, MdAdminPanelSettings,
  MdKeyboardArrowDown, MdCheckCircle, MdLightbulb, MdWarning,
  MdSearch, MdUpload, MdAdd, MdFilterList, MdSend, MdSchedule,
  MdDescription, MdAutoAwesome, MdArrowForward, MdBarChart,
  MdPersonAdd, MdDownload, MdVisibility, MdEdit, MdMoveToInbox,
} from 'react-icons/md';

/* ── Data ─────────────────────────────────────────────────────────────── */

const sections = [
  {
    id: 'dashboard',
    icon: MdDashboard,
    label: 'Tableau de bord',
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/50',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    description: 'Vue d\'ensemble des statistiques et alertes importantes de votre activité de recrutement.',
    steps: [
      { icon: MdBarChart, title: 'Statistiques en temps réel', text: 'Les 4 cartes en haut affichent le nombre total d\'offres actives, candidats, entretiens planifiés et candidatures reçues.' },
      { icon: MdWarning, title: 'Alertes automatiques', text: 'Les bannières d\'alerte signalent les entretiens non statués, les offres sans candidat, et les actions urgentes à traiter.' },
      { icon: MdBarChart, title: 'Graphiques d\'activité', text: 'Le graphique mensuel montre l\'évolution des candidatures. Le camembert présente la répartition par statut (Reçu, Présélection, Entretien, Offre).' },
    ],
    tips: [
      'Cliquez sur une alerte pour naviguer directement vers la section concernée.',
      'Les graphiques se mettent à jour automatiquement à chaque rechargement.',
    ],
  },
  {
    id: 'postings',
    icon: MdWork,
    label: 'Offres d\'emploi',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800/50',
    iconBg: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
    description: 'Créez et gérez vos offres d\'emploi, associez-leur une fiche de fonction et suivez les candidatures.',
    steps: [
      { icon: MdAdd, title: 'Créer une offre', text: 'Cliquez sur "Nouvelle offre" en haut à droite. Renseignez le titre, département, type de contrat, localisation, et les compétences requises avec leur pondération.' },
      { icon: MdDescription, title: 'Attacher une fiche de fonction (PDF)', text: 'Dans le détail de l\'offre, utilisez "Importer une fiche de fonction" pour attacher un PDF. Le système extrait automatiquement la description et les compétences via l\'IA.' },
      { icon: MdAutoAwesome, title: 'Générer une fiche de fonction', text: 'Si vous n\'avez pas de PDF, cliquez sur "Générer fiche de fonction" : l\'IA crée un document Word complet basé sur les informations de l\'offre.' },
      { icon: MdVisibility, title: 'Consulter les candidatures', text: 'Depuis le détail de l\'offre, cliquez sur "Voir les candidatures" pour accéder à la liste des candidats avec leurs scores de correspondance.' },
      { icon: MdEdit, title: 'Modifier ou clôturer', text: 'Les offres peuvent être modifiées à tout moment. Une fois le recrutement terminé, clôturez l\'offre — elle sera archivée dans "Offres clôturées".' },
    ],
    tips: [
      'Ajoutez des compétences avec des pondérations différentes (1–5) pour affiner le scoring automatique des CV.',
      'La fiche de fonction générée par l\'IA peut être téléchargée et modifiée avant utilisation.',
    ],
  },
  {
    id: 'pipeline',
    icon: MdAccountTree,
    label: 'Pipeline de recrutement',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    description: 'Suivez chaque candidat à travers les étapes du processus de sélection de façon visuelle.',
    steps: [
      { icon: MdFilterList, title: 'Vue Kanban', text: 'Le pipeline affiche les candidats en colonnes : Reçu → Présélection → Entretien → Offre → Refusé. Chaque carte montre le nom, score IA et l\'offre associée.' },
      { icon: MdArrowForward, title: 'Déplacer un candidat', text: 'Cliquez sur une carte candidat puis utilisez le bouton de déplacement pour changer son étape. Vous pouvez également le faire depuis le détail de sa candidature.' },
      { icon: MdSend, title: 'Envoyer un message de refus', text: 'Depuis la carte candidat, cliquez sur "Refuser" pour envoyer automatiquement un email de refus personnalisé au candidat.' },
      { icon: MdSchedule, title: 'Convoquer à un entretien', text: 'Cliquez sur "Convoquer" pour planifier un entretien. Renseignez la date, durée et format (visio, téléphone, présentiel). Un email de convocation est envoyé automatiquement.' },
    ],
    tips: [
      'Utilisez les filtres par offre pour n\'afficher que les candidats d\'un poste spécifique.',
      'Les candidats refusés restent visibles dans la colonne "Refusé" pour archivage.',
    ],
  },
  {
    id: 'candidates',
    icon: MdPeople,
    label: 'Candidats',
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    description: 'Gérez votre base de candidats, consultez leurs profils et importez des CV manuellement.',
    steps: [
      { icon: MdSearch, title: 'Rechercher un candidat', text: 'Utilisez la barre de recherche pour filtrer par nom, email ou compétences. Les résultats se mettent à jour en temps réel.' },
      { icon: MdPersonAdd, title: 'Ajouter un candidat manuellement', text: 'Cliquez sur "Nouveau candidat" pour créer un profil. Vous pouvez importer directement un CV en PDF — l\'IA extrait automatiquement nom, compétences et expériences.' },
      { icon: MdVisibility, title: 'Consulter un profil', text: 'Le détail d\'un candidat affiche ses informations extraites du CV, ses compétences avec niveaux, son expérience, et l\'historique de ses candidatures.' },
      { icon: MdDownload, title: 'Télécharger le CV', text: 'Depuis le profil candidat, cliquez sur "CV" pour télécharger le fichier PDF original soumis par le candidat.' },
    ],
    tips: [
      'Un candidat peut postuler à plusieurs offres — son profil est partagé entre toutes ses candidatures.',
      'Le score de correspondance IA est calculé automatiquement selon les compétences requises de chaque offre.',
    ],
  },
  {
    id: 'email-candidatures',
    icon: MdEmail,
    label: 'Candidatures email',
    gradient: 'from-sky-500 to-cyan-600',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-800/50',
    iconBg: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',
    description: 'Le système traite automatiquement les emails de candidature reçus avec CV en pièce jointe.',
    steps: [
      { icon: MdMoveToInbox, title: 'Réception automatique', text: 'Chaque email envoyé à l\'adresse de recrutement configurée est analysé toutes les 5 minutes. Le CV en PDF est extrait automatiquement.' },
      { icon: MdAutoAwesome, title: 'Matching IA', text: 'L\'IA analyse le contenu du CV et l\'objet de l\'email pour identifier l\'offre correspondante parmi vos offres actives, avec un score de confiance.' },
      { icon: MdCheckCircle, title: 'Création automatique du candidat', text: 'Si la correspondance est suffisante (≥ 65%), un profil candidat est créé automatiquement et la candidature est rattachée à l\'offre détectée.' },
      { icon: MdVisibility, title: 'Consulter les logs', text: 'La page "Candidatures email" liste tous les emails reçus avec leur statut : Traité, Aucune correspondance, Pas de PDF, Doublon.' },
    ],
    tips: [
      'Les emails d\'expéditeurs automatiques (newsletters, no-reply) sont filtrés automatiquement.',
      'En cas d\'échec du matching, le candidat peut être créé manuellement depuis la page Candidats.',
    ],
    warning: 'Assurez-vous que l\'adresse email de recrutement est connue des candidats et que le polling IMAP est activé.',
  },
  {
    id: 'interviews',
    icon: MdEventNote,
    label: 'Entretiens',
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800/50',
    iconBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
    description: 'Planifiez, suivez et clôturez les entretiens avec vos candidats.',
    steps: [
      { icon: MdSchedule, title: 'Planifier un entretien', text: 'Depuis le pipeline ou la page Entretiens, créez un entretien en sélectionnant le candidat, la date, la durée et le format (visio, téléphone, présentiel).' },
      { icon: MdSend, title: 'Convocation automatique', text: 'Un email de convocation est envoyé immédiatement au candidat avec tous les détails : date, heure, format et lieu ou lien visio.' },
      { icon: MdCheckCircle, title: 'Mettre à jour le statut', text: 'Après l\'entretien, marquez-le comme "Concluant" ou "Non concluant" pour garder un historique précis et mettre à jour le pipeline.' },
      { icon: MdVisibility, title: 'Vue calendrier', text: 'La page Entretiens affiche tous les entretiens planifiés, passés et à venir, filtrables par date et statut.' },
    ],
    tips: [
      'Les entretiens passés sans statut déclenchent une alerte sur le tableau de bord.',
      'Le format "Présentiel" permet d\'indiquer une adresse ou un bureau spécifique.',
    ],
  },
  {
    id: 'documents',
    icon: MdFolder,
    label: 'Documents',
    gradient: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-50 dark:bg-slate-800/30',
    border: 'border-slate-200 dark:border-slate-700/50',
    iconBg: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400',
    description: 'Exportez des rapports et accédez aux fiches de fonction générées.',
    steps: [
      { icon: MdDownload, title: 'Exporter un rapport', text: 'Depuis la page Documents, sélectionnez le type de rapport (candidats, offres, entretiens) et la période souhaitée, puis cliquez sur "Exporter en Excel".' },
      { icon: MdDescription, title: 'Fiches de fonction', text: 'Les fiches de fonction générées pour chaque offre sont accessibles et téléchargeables directement depuis cette page ou depuis le détail de l\'offre.' },
      { icon: MdUpload, title: 'Import en masse de CV', text: 'Utilisez l\'import en masse pour déposer plusieurs CV simultanément. Le système traite chaque fichier et crée les profils candidats automatiquement.' },
    ],
    tips: [
      'Les exports Excel incluent toutes les données filtrées selon vos critères de sélection.',
    ],
  },
  {
    id: 'notifications',
    icon: MdNotifications,
    label: 'Notifications',
    gradient: 'from-fuchsia-500 to-purple-600',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    border: 'border-fuchsia-200 dark:border-fuchsia-800/50',
    iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400',
    description: 'Restez informé de toutes les activités importantes en temps réel.',
    steps: [
      { icon: MdNotifications, title: 'Centre de notifications', text: 'La cloche dans la barre du haut affiche le nombre de notifications non lues. Cliquez pour voir le fil d\'actualité complet.' },
      { icon: MdCheckCircle, title: 'Types de notifications', text: 'Vous recevez des notifications pour : nouvelles candidatures, entretiens planifiés, changements de statut dans le pipeline, et alertes système.' },
      { icon: MdVisibility, title: 'Marquer comme lu', text: 'Cliquez sur une notification pour la marquer comme lue et naviguer vers l\'élément concerné. Utilisez "Tout marquer comme lu" pour vider le compteur.' },
    ],
    tips: [
      'Les notifications importantes (entretien imminent, candidature urgente) s\'affichent aussi sur le tableau de bord.',
    ],
  },
  {
    id: 'admin',
    icon: MdAdminPanelSettings,
    label: 'Administration (Admin uniquement)',
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/50',
    iconBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    adminOnly: true,
    description: 'Gérez les utilisateurs de la plateforme et consultez l\'historique complet des actions.',
    steps: [
      { icon: MdPersonAdd, title: 'Créer un utilisateur RH', text: 'Dans Administration, cliquez sur "Nouvel utilisateur". Renseignez nom, email et département. Le système crée le compte Keycloak et envoie un email avec les identifiants temporaires.' },
      { icon: MdEdit, title: 'Modifier ou désactiver', text: 'Vous pouvez modifier les informations d\'un utilisateur ou désactiver son accès sans supprimer son historique d\'activité.' },
      { icon: MdVisibility, title: 'Journal d\'audit', text: 'Le journal d\'audit liste toutes les actions effectuées sur la plateforme : qui a fait quoi et quand. Filtrable par utilisateur, type d\'action et période.' },
    ],
    tips: [
      'La désactivation d\'un compte révoque l\'accès immédiatement sans perdre les données historiques.',
      'Le journal d\'audit est immuable — aucune entrée ne peut être supprimée.',
    ],
    warning: 'Cette section est réservée aux administrateurs. Les actions sur les comptes utilisateurs sont irréversibles.',
  },
];

/* ── Sub-components ────────────────────────────────────────────────────── */

const StepCard = ({ icon: Icon, title, text, iconBg }) => (
  <div className="flex gap-3">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{text}</p>
    </div>
  </div>
);

const Section = ({ section }) => {
  const [open, setOpen] = useState(false);
  const { icon: Icon, label, gradient, bg, border, iconBg, description, steps, tips, warning, adminOnly } = section;

  return (
    <div className={`rounded-2xl border ${border} overflow-hidden transition-shadow duration-300 ${open ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-4 px-5 py-4 ${bg} transition-colors duration-150 text-left`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</p>
            {adminOnly && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-1">{description}</p>
        </div>
        <MdKeyboardArrowDown
          className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 py-5 bg-white dark:bg-slate-900 space-y-5">
          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{i + 1}</span>
                </div>
                <StepCard icon={step.icon} title={step.title} text={step.text} iconBg={iconBg} />
              </div>
            ))}
          </div>

          {/* Tips */}
          {tips?.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-2">
                <MdLightbulb className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Conseils</p>
              </div>
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <MdCheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          )}

          {/* Warning */}
          {warning && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 px-4 py-3">
              <MdWarning className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{warning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Page ──────────────────────────────────────────────────────────────── */

export const GuidePage = () => {
  const [search, setSearch] = useState('');

  const filtered = sections.filter(
    (s) =>
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.steps.some(
        (st) =>
          st.title.toLowerCase().includes(search.toLowerCase()) ||
          st.text.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#060912]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-10">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_30%_50%,white_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <MdLightbulb className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Guide d'utilisation</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            Comment utiliser GRH Ventec ?
          </h1>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed max-w-xl">
            Ce guide vous accompagne pas à pas dans l'utilisation de toutes les fonctionnalités
            de la plateforme de recrutement. Cliquez sur une section pour la développer.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Search */}
        <div className="relative">
          <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans le guide..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all shadow-sm"
          />
        </div>

        {/* Quick-nav chips */}
        {!search && (
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map((section) => (
              <div key={section.id} id={`section-${section.id}`}>
                <Section section={section} />
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <MdSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Aucun résultat pour "{search}"</p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="text-center pt-4 pb-2">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Pour toute question, contactez votre administrateur système.
          </p>
        </div>
      </div>
    </div>
  );
};
