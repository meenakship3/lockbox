import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { useTokens } from '@/hooks/useTokens';
import { TokenTable } from '@/components/token-table';
import { TokenDialog } from '@/components/token-dialog';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { Plus, Download, RefreshCw, ShieldCheck, HardDrive, Copy, Trash2 } from 'lucide-react';
import { Token } from '@/types/electron';
import { useAutoLock } from '@/hooks/useAutoLock';
import { toast } from 'sonner';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLock = async () => {
    try {
      await window.api.auth.lock();
      setIsAuthenticated(false);
      toast.info('App locked due to inactivity');
    } catch (error) {
      console.error('Lock error:', error);
    }
  };

  // Enable auto-lock only when authenticated
  useAutoLock({
    onLock: handleLock,
    enabled: isAuthenticated
  });

  if (!isAuthenticated) {
    return (
      <>
        <Toaster />
        <LoginScreen onAuthenticated={() => setIsAuthenticated(true)} />
      </>
    );
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { tokens, loading, error, loadTokens, deleteToken, getDecryptedTokens } = useTokens();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedToken, setSelectedToken] = useState<Token | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const tokensPerPage = 10;
  
  // Calculate pagination
  const totalPages = Math.ceil(tokens.length / tokensPerPage);
  const startIndex = (currentPage - 1) * tokensPerPage;
  const endIndex = startIndex + tokensPerPage;
  const paginatedTokens = tokens.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleAddToken = () => {
    setDialogMode('add');
    setSelectedToken(undefined);
    setDialogOpen(true);
  };

  const handleEditToken = (token: Token) => {
    setDialogMode('edit');
    setSelectedToken(token);
    setDialogOpen(true);
  };

  const handleDeleteTokens = async (ids: string[]) => {
    if (confirm(`Delete ${ids.length} token(s)?`)) {
      for (const id of ids) {
        await deleteToken(id);
      }
    }
  };

  const handleExportEnv = async (selectedOnly = false) => {
    // Get tokens to export (selected or all)
    const tokensToExport = selectedOnly
      ? tokens.filter(t => selectedIds.includes(t.id))
      : tokens;

    if (tokensToExport.length === 0) {
      toast.error('No tokens to export');
      return;
    }

    // Get decrypted tokens
    const decryptedTokens = await getDecryptedTokens(tokensToExport.map(t => t.id));

    if (!decryptedTokens || decryptedTokens.length === 0) {
      toast.error('Failed to decrypt tokens');
      return;
    }

    // Create .env format: SERVICENAME_TOKENNAME=value
    const envContent = decryptedTokens
      .map(t => {
        const serviceName = t.service.toUpperCase().replace(/\s+/g, '_');
        const tokenName = t.token.toUpperCase().replace(/\s+/g, '_');
        return `${serviceName}_${tokenName}=${t.value}`;
      })
      .join('\n');

    // Trigger download
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);

    // Wait for download to initiate before showing success
    setTimeout(() => {
      toast.success(`Exported ${decryptedTokens.length} token(s) as .env file`);
    }, 5000);
  };

  const handleExportBash = async () => {
    if (selectedIds.length === 0) {
      toast.error('No tokens selected');
      return;
    }

    // Get decrypted selected tokens
    const decryptedTokens = await getDecryptedTokens(selectedIds);

    if (!decryptedTokens || decryptedTokens.length === 0) {
      toast.error('Failed to decrypt tokens');
      return;
    }

    // Create bash export format: export SERVICENAME_TOKENNAME="value"
    const bashContent = decryptedTokens
      .map(t => {
        const serviceName = t.service.toUpperCase().replace(/\s+/g, '_');
        const tokenName = t.token.toUpperCase().replace(/\s+/g, '_');
        return `export ${serviceName}_${tokenName}="${t.value}"`;
      })
      .join('\n');

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(bashContent);
      toast.success(`Copied ${decryptedTokens.length} token(s) as bash exports to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
      console.error('Clipboard error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-neutral-600 font-mono">Loading tokens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-100">
        <div className="text-center text-red-500">
          <p className="font-mono text-lg mb-2">Error loading tokens</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <Toaster />

      {/* Retro scanline background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          background:
            "repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent 3px), radial-gradient(1000px 500px at 50% -20%, #0f172a 0%, transparent 60%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-neutral-200 bg-gradient-to-b from-neutral-900 to-neutral-800 text-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
          <div className="h-11 w-11 rounded-[8px] bg-neutral-700/60 border border-neutral-600 flex items-center justify-center shadow-inner">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-bold tracking-[0.08em] font-mono">EnvVault</div>
            <div className="text-xs text-neutral-300 font-mono tracking-widest">Secure Token Management</div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-neutral-300 font-mono">
            <HardDrive className="h-4 w-4 text-emerald-300" />
            {tokens.length} tokens
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="relative z-10 mx-auto max-w-7xl p-6">
        {/* Action Bar */}
        <div className="mb-6 bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-lg p-4 flex items-center gap-3">
          <Button
            onClick={handleAddToken}
            className="bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-neutral-700 font-mono"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Token
          </Button>

          <Button
            variant="outline"
            onClick={loadTokens}
            className="font-mono"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() => handleExportEnv(true)}
            disabled={selectedIds.length === 0}
            className="font-mono"
          >
            <Download className="w-4 h-4 mr-2" />
            Export .env
          </Button>

          <Button
            variant="outline"
            onClick={handleExportBash}
            disabled={selectedIds.length === 0}
            className="font-mono"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Bash
          </Button>

          <Button
            variant="destructive"
            onClick={() => handleDeleteTokens(selectedIds)}
            disabled={selectedIds.length === 0}
            className="font-mono"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>

          <div className="ml-auto text-xs text-neutral-500 font-mono">
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : `${tokens.length} ${tokens.length === 1 ? 'token' : 'tokens'}`
            }
          </div>
        </div>

        {/* Token Table */}
        <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          <TokenTable
            tokens={paginatedTokens}
            onEdit={handleEditToken}
            onDelete={handleDeleteTokens}
            onSelectionChange={setSelectedIds}
            getDecryptedTokens={async (ids) => {
              const result = await getDecryptedTokens(ids);
              return result || [];
            }}
          />
        </div>

        {/* Pagination Controls */}
        {tokens.length > tokensPerPage && (
          <div className="mt-4 flex items-center justify-between bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-lg p-4">
            <div className="text-sm text-neutral-600 font-mono">
              Showing {startIndex + 1}-{Math.min(endIndex, tokens.length)} of {tokens.length} tokens
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="font-mono"
              >
                &lt;
              </Button>
              <span className="text-sm text-neutral-600 font-mono px-3">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="font-mono"
              >
                &gt;
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Add/Edit Dialog */}
      <TokenDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        tokenData={selectedToken}
        onSuccess={loadTokens}
      />
    </main>
  );
}

export default App;