const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  SCREENING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  SHORTLISTED: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  INTERVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  OFFER: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  HIRED: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  PENDING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  RUNNING: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  DONE: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  CANCELLED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const STATUS_LABELS = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  CLOSED: 'Fermé',
  NEW: 'Nouveau',
  SCREENING: 'Présélection',
  SHORTLISTED: 'Sélectionné',
  INTERVIEW: 'Entretien',
  OFFER: 'Offre',
  HIRED: 'Embauché',
  REJECTED: 'Rejeté',
  PENDING: 'En attente',
  RUNNING: 'En cours',
  DONE: 'Terminé',
  FAILED: 'Échoué',
  SCHEDULED: 'Planifié',
  CANCELLED: 'Annulé',
};

export const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.DRAFT}`}>
    {STATUS_LABELS[status] || status}
  </span>
);
