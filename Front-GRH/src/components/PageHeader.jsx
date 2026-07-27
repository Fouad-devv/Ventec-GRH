export const PageHeader = ({ subtitle }) => {
  if (!subtitle) return null;
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{subtitle}</p>
  );
};
