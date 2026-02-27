export const Footer = () => {
  return (
    <footer className="h-12 border-t border-border bg-card flex items-center justify-between px-6 text-sm text-muted-foreground">
      <span>© {new Date().getFullYear()} Fuely Dashboard</span>
      <span>Built with React, Vite, Tailwind</span>
    </footer>
  );
};


