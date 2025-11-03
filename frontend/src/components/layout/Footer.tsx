export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-6 px-6 mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="text-center md:text-left">
          <p>© 2025 College of Science, Technology and Applied Arts of Trinidad and Tobago</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <p className="font-medium">TAPS System v1.0.0</p>
          <p className="text-xs">Powered by the Technology Services Department.</p>
        </div>
      </div>
    </footer>
  );
}

