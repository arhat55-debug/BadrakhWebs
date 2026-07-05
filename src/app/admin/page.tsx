"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2 } from "lucide-react";

interface Bind {
  type: "facebook" | "google" | "twitter" | "other";
  value: string;
  label?: string;
}

interface Product {
  id: number;
  title: string;
  gameId: string;
  category: string;
  status: string;
  basePrice: number;
  messengerLink: string;
  imageUrls: string[];
  tags: string[];
  binds: Bind[];
}

interface ContactConfig {
  name: string;
  url: string;
  phone: string;
}

const DEFAULT_CONTACTS: ContactConfig[] = [
  { name: "Админ Бадрах", url: "https://m.me/Badrakhgamestore.Admin", phone: "" },
  { name: "Мидман Төгөлдөр", url: "https://m.me/TuguldurKrx", phone: "" },
  { name: "Мидман Жаргалсайхан", url: "https://m.me/jargalsaikhan.official", phone: "" },
];

const BIND_TYPES = [
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "twitter", label: "Twitter/X" },
  { value: "other", label: "Бусад" },
];

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "settings">("products");

  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [title, setTitle] = useState("");
  const [gameId, setGameId] = useState("");
  const [category, setCategory] = useState("account");
  const [status, setStatus] = useState("available");
  const [basePrice, setBasePrice] = useState("");
  const [messengerLink, setMessengerLink] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [binds, setBinds] = useState<Bind[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [contacts, setContacts] = useState<ContactConfig[]>(DEFAULT_CONTACTS);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setIsLoggedIn(true); fetchProducts(); loadSettings(); }
      else setIsLoggedIn(false);
    };
    checkUser();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem("badrakh_contacts");
      if (saved) setContacts(JSON.parse(saved));
    } catch {}
  };

  const saveSettings = () => {
    localStorage.setItem("badrakh_contacts", JSON.stringify(contacts));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError("Имэйл эсвэл нууц үг буруу: " + error.message);
    else if (data.user) { setIsLoggedIn(true); fetchProducts(); loadSettings(); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setIsLoggedIn(false); };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) setProducts(await res.json());
    } catch {}
  };

  const resetForm = () => {
    setTitle(""); setGameId(""); setCategory("account"); setStatus("available");
    setBasePrice(""); setMessengerLink(""); setTagsInput(""); setImages([]);
    setBinds([]); setEditingProduct(null); setError("");
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setTitle(product.title);
    setGameId(product.gameId);
    setCategory(product.category);
    setStatus(product.status);
    setBasePrice(String(product.basePrice));
    setMessengerLink(product.messengerLink || "");
    setTagsInput((product.tags || []).join(", "));
    setImages(product.imageUrls || []);
    setBinds(product.binds || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setError("");
    const files = Array.from(e.target.files);
    try {
      const urls = await Promise.all(files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "pubg_preset");
        const res = await fetch("https://api.cloudinary.com/v1_1/drxjlkcdq/image/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error();
        return (await res.json()).secure_url;
      }));
      setImages((prev) => [...prev, ...urls.filter(Boolean)]);
    } catch { setError("Зураг хуулахад алдаа гарлаа."); }
    finally { setUploading(false); }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  // Bind handlers
  const addBind = () => setBinds((prev) => [...prev, { type: "facebook", value: "", label: "" }]);
  const removeBind = (idx: number) => setBinds((prev) => prev.filter((_, i) => i !== idx));
  const updateBind = (idx: number, field: keyof Bind, value: string) => {
    setBinds((prev) => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const body = { title, gameId, category, status, basePrice: Number(basePrice), messengerLink, imageUrls: images, tags, binds };

    try {
      let res;
      if (editingProduct) {
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error();
      resetForm();
      fetchProducts();
      alert(editingProduct ? "Амжилттай шинэчлэгдлээ!" : "Зар амжилттай нийтлэгдлээ!");
    } catch { setError("Хадгалахад алдаа гарлаа."); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Энэ зарыг устгахдаа итгэлтэй байна уу?")) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchProducts();
      alert("Амжилттай устгагдлаа!");
    } catch { alert("Устгаж чадсангүй."); }
  };

  if (isLoggedIn === null) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Уншиж байна...</div>;

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-md space-y-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white text-center">Админ Нэвтрэх</h2>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Имэйл</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Нууц үг</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" required />
        </div>
        {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">Нэвтрэх</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">Хянах самбар</h1>
          <button onClick={handleLogout} className="text-sm bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg border border-red-900/50 transition">Гарах</button>
        </div>

        <div className="flex gap-2">
          {(["products", "settings"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
              {tab === "products" ? "Зар" : "Тохиргоо"}
            </button>
          ))}
        </div>

        {activeTab === "products" && (
          <>
            <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-5">
              {editingProduct && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <span className="text-yellow-400 text-sm font-semibold">✏️ Засварлаж байна: {editingProduct.title}</span>
                  <button type="button" onClick={resetForm} className="ml-auto text-xs text-gray-400 hover:text-white">Цуцлах</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Гарчиг *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Тоглоомын ID *</label>
                  <input type="text" value={gameId} onChange={(e) => setGameId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ангилал</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="account">Admin Acc</option>
                    <option value="topup">Paid Post</option>
                    <option value="midman">Мидман</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Төлөв</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="available">Бэлэн байгаа</option>
                    <option value="sold">Зарагдсан</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Үндсэн үнэ (₮) *</label>
                  <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Холбогдох Messenger Линк</label>
                  <input type="url" value={messengerLink} onChange={(e) => setMessengerLink(e.target.value)} placeholder="https://m.me/username" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Тагууд (таслалаар тусгаарлана уу)</label>
                <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="m416, max, glacier" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>

              {/* BIND ХЭСЭГ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-200">Bind мэдээлэл</label>
                  <button type="button" onClick={addBind}
                    className="flex items-center gap-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-lg transition">
                    <Plus className="w-3.5 h-3.5" /> Bind нэмэх
                  </button>
                </div>
                {binds.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Bind мэдээлэл нэмэгдээгүй байна.</p>
                )}
                {binds.map((bind, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select value={bind.type} onChange={(e) => updateBind(idx, "type", e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                        {BIND_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <input type="text" value={bind.value} onChange={(e) => updateBind(idx, "value", e.target.value)}
                        placeholder="example@gmail.com эсвэл link"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 sm:col-span-2" />
                    </div>
                    <button type="button" onClick={() => removeBind(idx)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* ЗУРГУУД */}
              <div>
                <label className="block text-sm font-medium mb-2">Зургууд</label>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="cursor-pointer bg-gray-800 border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center w-24 h-24 transition">
                    <span className="text-xs text-gray-400 text-center">{uploading ? "Уншиж байна..." : "Хуулах"}</span>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                  {images.map((url, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-800">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetForm} className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium px-4 py-2 rounded-lg transition">Цуцлах</button>
                <button type="submit" disabled={loading || uploading} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-50">
                  {loading ? "Хадгалж байна..." : editingProduct ? "Шинэчлэх" : "Нийтлэх"}
                </button>
              </div>
            </form>

            {/* ЖАГСААЛТ */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-800/50 text-gray-400 text-sm border-b border-gray-800">
                    <th className="p-4">ЗАР</th>
                    <th className="p-4">АНГИЛАЛ</th>
                    <th className="p-4">ҮНЭ</th>
                    <th className="p-4">BIND</th>
                    <th className="p-4 text-center">ҮЙЛДЭЛ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-800/30 transition">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                          {product.imageUrls?.[0]
                            ? <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">No Img</div>}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-200">{product.title}</div>
                          <div className="text-xs text-gray-500">ID: {product.gameId}</div>
                        </div>
                      </td>
                      <td className="p-4 capitalize text-gray-400">{product.category}</td>
                      <td className="p-4 font-medium text-blue-400">₮{product.basePrice.toLocaleString()}</td>
                      <td className="p-4 text-xs text-gray-400">
                        {product.binds && product.binds.length > 0
                          ? product.binds.map((b, i) => (
                            <span key={i} className="block">{b.type}: {b.value}</span>
                          ))
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => startEdit(product)} className="bg-blue-950/40 hover:bg-blue-900/60 border border-blue-900/50 text-blue-400 px-3 py-1.5 rounded-lg transition text-xs font-medium">Засах</button>
                          <button onClick={() => handleDelete(product.id)} className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 px-3 py-1.5 rounded-lg transition text-xs font-medium">Устгах</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Одоогоор ямар нэгэн зар байхгүй байна.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "settings" && (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-6">
            <h2 className="text-lg font-bold text-white">Холбоо барих мэдээлэл</h2>
            {contacts.map((contact, idx) => (
              <div key={idx} className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 space-y-3">
                <p className="text-sm font-semibold text-blue-400">{contact.name}</p>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Messenger линк</label>
                  <input type="text" value={contact.url}
                    onChange={(e) => { const u = [...contacts]; u[idx].url = e.target.value; setContacts(u); }}
                    placeholder="https://m.me/username"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Утасны дугаар</label>
                  <input type="text" value={contact.phone}
                    onChange={(e) => { const u = [...contacts]; u[idx].phone = e.target.value; setContacts(u); }}
                    placeholder="99001234"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            ))}
            <button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition">
              {settingsSaved ? "✓ Хадгалагдлаа!" : "Хадгалах"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
