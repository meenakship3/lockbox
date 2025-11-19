import { useState } from 'react';
import { Token } from '@/types/electron';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, EyeOff, Pencil, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TokenTableProps {
  tokens: Token[];
  onEdit: (token: Token) => void;
  onDelete: (ids: string[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  getDecryptedTokens: (ids: string[]) => Promise<Token[]>
}

export function TokenTable({ tokens, onEdit, onDelete, onSelectionChange, getDecryptedTokens }: TokenTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [decryptedValues, setDecryptedValues] = useState<Map<string, string>>(new Map())

  const maskToken = (): string => {
    return `${"•".repeat(15)}`;
  };

  const getTokenStatus = (expiryDate?: string): 'active' | 'expiring' | 'expired' => {
    if (!expiryDate) return 'active';

    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'expiring';
    return 'active';
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(tokens.map(t => t.id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const toggleTokenVisibility = async (id: string) => {
    const newVisible = new Set(visibleTokens);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      if (!decryptedValues.has(id)) {
        try {
          const decryptedTokens = await getDecryptedTokens([id])
          if (decryptedTokens.length > 0) {
            const newDecrypted = new Map(decryptedValues);
            newDecrypted.set(id, decryptedTokens[0].value);
            setDecryptedValues(newDecrypted);
          }
        } catch (error) {
          console.error('Failed to decrypt token:', error);
          return;
        }
      }
      newVisible.add(id);
    }
    setVisibleTokens(newVisible);
  };


  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      expiring: 'bg-amber-100 text-amber-800 border-amber-300',
      expired: 'bg-rose-100 text-rose-800 border-rose-300'
    };

    return (
      <Badge variant="outline" className={cn(variants[status as keyof typeof variants])}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === tokens.length && tokens.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Token Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-neutral-500 py-8">
                  No tokens found. Add your first token to get started.
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((token) => {
                const status = getTokenStatus(token.expiryDate);
                const isVisible = visibleTokens.has(token.id);

                return (
                  <TableRow key={token.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(token.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(token.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{token.service}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{token.token}</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0">
                              <Info className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Token Type</h4>
                                <Badge variant="outline">{token.type}</Badge>
                              </div>
                              {token.description && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-1">Description</h4>
                                  <p className="text-sm text-neutral-600">{token.description}</p>
                                </div>
                              )}
                              {!token.description && (
                                <p className="text-sm text-neutral-400 italic">No description provided</p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const value = decryptedValues.get(token.id);
                            if (isVisible && value) {
                              navigator.clipboard.writeText(value);
                              toast.success('Token copied to clipboard!');
                            }
                          }}
                          className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded hover:bg-neutral-200 transition-colors w-[15vw] min-w-[127px] max-w-[127px] truncate text-left">
                            {isVisible ? (decryptedValues.get(token.id) || maskToken()) 
                                       : maskToken()}
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleTokenVisibility(token.id)}
                        >
                          {isVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell>
                      {token.expiryDate || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(token)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete([token.id])}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}