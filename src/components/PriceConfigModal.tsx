import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, LogIn, LogOut, ShieldAlert, RefreshCw } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useCart } from '../context/CartContext';
import { formatRupiah } from '../utils/formatters';

interface PriceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminOrderSummary {
  orderId: string;
  totalQuantity: number;
  orderSubtotal: number;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  googleMapsUrl: string;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineSubtotal: number;
  }>;
}

export const PriceConfigModal: React.FC<PriceConfigModalProps> = ({ isOpen, onClose }) => {
  const { products, refreshCatalog } = useCart();

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [adminOrders, setAdminOrders] = useState<AdminOrderSummary[]>([]);

  const [capcinPriceInput, setCapcinPriceInput] = useState<string>('8000');
  const [shihlinPriceInput, setShihlinPriceInput] = useState<string>('30000');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (!user) {
        setIsAuthorizedAdmin(false);
        setAdminOrders([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const capcin = products.find(p => p.id === 'capcin');
      const shihlin = products.find(p => p.id === 'shihlin');
      setCapcinPriceInput(capcin?.defaultPrice ? String(capcin.defaultPrice) : '8000');
      setShihlinPriceInput(shihlin?.defaultPrice ? String(shihlin.defaultPrice) : '30000');
      setAuthError(null);
      setStatusMessage(null);
    }
  }, [isOpen, products]);

  const fetchAdminData = useCallback(async (user: User) => {
    setIsLoadingAdmin(true);
    setAuthError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      const data = (await res.json()) as {
        orders?: AdminOrderSummary[];
        error?: { message?: string };
      };

      if (!res.ok) {
        setIsAuthorizedAdmin(false);
        setAuthError(
          data.error?.message ||
            'Akses ditolak: Akun ini tidak memiliki otorisasi administrator di server.'
        );
      } else {
        setIsAuthorizedAdmin(true);
        setAdminOrders(data.orders || []);
      }
    } catch {
      setAuthError('Gagal memverifikasi otorisasi admin ke server.');
    } finally {
      setIsLoadingAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && currentUser) {
      void fetchAdminData(currentUser);
    }
  }, [isOpen, currentUser, fetchAdminData]);

  // Close dialog when Escape is pressed per R-26 and R-32.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Gagal masuk dengan Google Authentication.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsAuthorizedAdmin(false);
    setAdminOrders([]);
  };

  const handleSaveCatalogPrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isAuthorizedAdmin) return;

    setStatusMessage(null);
    setAuthError(null);

    const capcinPrice = parseInt(capcinPriceInput, 10);
    const shihlinPrice = parseInt(shihlinPriceInput, 10);

    if (!Number.isInteger(capcinPrice) || capcinPrice < 1000 || !Number.isInteger(shihlinPrice) || shihlinPrice < 1000) {
      setAuthError('Harga wajib berupa bilangan bulat Rupiah minimal Rp1.000.');
      return;
    }

    try {
      setIsLoadingAdmin(true);
      const token = await currentUser.getIdToken();

      const res1 = await fetch('/api/admin/catalog/capcin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ unitPrice: capcinPrice, available: true })
      });

      const res2 = await fetch('/api/admin/catalog/shihlin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ unitPrice: shihlinPrice, available: true })
      });

      if (!res1.ok || !res2.ok) {
        setAuthError('Server menolak perubahan harga katalog.');
      } else {
        await refreshCatalog();
        setStatusMessage('Harga resmi di server berhasil diperbarui.');
      }
    } catch {
      setAuthError('Gagal menyimpan perubahan harga ke server.');
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    if (!currentUser || !isAuthorizedAdmin) return;
    setAuthError(null);
    setStatusMessage(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setAuthError(data.error?.message || 'Gagal memperbarui status pesanan.');
      } else {
        await fetchAdminData(currentUser);
        setStatusMessage(`Status pesanan ${orderId} diperbarui ke ${nextStatus}.`);
      }
    } catch {
      setAuthError('Gagal menghubungi server untuk memperbarui status pesanan.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 border border-[#21191A]/20 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#21191A]/15">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#710014] block">
              Panel Otorisasi Server
            </span>
            <h2 id="admin-modal-title" className="text-xl font-bold text-[#21191A]">
              Admin Pesanan & Harga Resmi CHICKCHAU
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] p-2 text-[#21191A] hover:bg-[#F2F1ED] rounded-xl flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
            aria-label="Tutup panel admin"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {authError && (
          <div
            role="alert"
            className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-start gap-2"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
            <span>{authError}</span>
          </div>
        )}

        {statusMessage && (
          <div
            role="status"
            className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold"
          >
            {statusMessage}
          </div>
        )}

        {!currentUser ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-[#524346] leading-relaxed">
              Harga produk dan status pesanan dikelola secara terpusat di server. Masuk menggunakan akun Google Administrator terverifikasi untuk mengelola harga katalog dan daftar pesanan.
            </p>
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#710014] hover:bg-[#580010] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk dengan Akun Google Admin</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F2F1ED] border border-[#21191A]/15 text-xs">
              <div>
                <span className="text-[#524346] block">Akun Terautentikasi:</span>
                <strong className="text-[#21191A] font-bold">{currentUser.email}</strong>
              </div>
              <div className="flex items-center gap-2">
                {isAuthorizedAdmin && (
                  <button
                    type="button"
                    onClick={() => void fetchAdminData(currentUser)}
                    className="min-h-[44px] px-3 py-2 rounded-lg border border-[#21191A]/25 bg-white text-[#21191A] font-bold inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Muat Ulang</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="min-h-[44px] px-3 py-2 rounded-lg border border-[#21191A]/25 bg-white text-[#710014] font-bold inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>

            {isLoadingAdmin && (
              <p className="text-xs font-semibold text-[#524346]">
                Memverifikasi otorisasi server...
              </p>
            )}

            {isAuthorizedAdmin && (
              <>
                <form onSubmit={e => void handleSaveCatalogPrices(e)} className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#21191A]">
                    Otoritas Harga Katalog Server (IDR)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F2F1ED] rounded-xl border border-[#21191A]/20">
                      <label
                        htmlFor="price-capcin"
                        className="block text-xs font-bold text-[#21191A] mb-2"
                      >
                        1. Cappuccino Cincau (Capcin)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#21191A]">Rp</span>
                        <input
                          id="price-capcin"
                          type="number"
                          min="1000"
                          step="500"
                          value={capcinPriceInput}
                          onChange={e => setCapcinPriceInput(e.target.value)}
                          className="flex-1 min-h-[44px] px-3 py-2 rounded-lg border border-[#21191A]/35 bg-white text-sm font-bold tabular-nums text-[#21191A]"
                        />
                      </div>
                      <p className="text-xs text-[#524346] mt-1">
                        Aktif: {formatRupiah(parseInt(capcinPriceInput, 10) || 0)}
                      </p>
                    </div>

                    <div className="p-4 bg-[#F2F1ED] rounded-xl border border-[#21191A]/20">
                      <label
                        htmlFor="price-shihlin"
                        className="block text-xs font-bold text-[#21191A] mb-2"
                      >
                        2. Shihlin Crispy Chicken
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#21191A]">Rp</span>
                        <input
                          id="price-shihlin"
                          type="number"
                          min="1000"
                          step="500"
                          value={shihlinPriceInput}
                          onChange={e => setShihlinPriceInput(e.target.value)}
                          className="flex-1 min-h-[44px] px-3 py-2 rounded-lg border border-[#21191A]/35 bg-white text-sm font-bold tabular-nums text-[#21191A]"
                        />
                      </div>
                      <p className="text-xs text-[#524346] mt-1">
                        Aktif: {formatRupiah(parseInt(shihlinPriceInput, 10) || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoadingAdmin}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#710014] hover:bg-[#580010] text-xs font-bold text-white inline-flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Harga Server</span>
                    </button>
                  </div>
                </form>

                <div className="pt-4 border-t border-[#21191A]/15 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#21191A]">
                    Daftar Pesanan Masuk ({adminOrders.length})
                  </h3>

                  {adminOrders.length === 0 ? (
                    <p className="text-xs text-[#524346]">
                      Belum ada pesanan yang tercatat di server.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {adminOrders.map(order => (
                        <div
                          key={order.orderId}
                          className="p-3.5 rounded-xl border border-[#21191A]/20 bg-[#FAF9F6] text-xs space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="font-bold text-[#21191A]">
                              {order.orderId} · {order.customerName} ({order.customerPhone})
                            </strong>
                            <span className="px-2 py-0.5 rounded bg-[#21191A] text-white font-bold">
                              {order.status}
                            </span>
                          </div>
                          <p className="text-[#524346]">
                            Total Sementara: <strong>{formatRupiah(order.orderSubtotal)}</strong> ({order.totalQuantity} item) · Alamat: {order.deliveryAddress}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {(
                              [
                                'confirmed',
                                'preparing',
                                'completed',
                                'cancelled'
                              ] as const
                            ).map(st => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => void handleUpdateOrderStatus(order.orderId, st)}
                                className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#21191A]/25 bg-white hover:bg-[#F2F1ED] font-semibold text-[#21191A]"
                              >
                                Set: {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
