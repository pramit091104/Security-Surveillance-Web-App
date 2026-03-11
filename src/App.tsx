import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Shield, 
  Plus, 
  Trash2, 
  Bell, 
  LogOut, 
  User, 
  Activity, 
  MapPin, 
  Video,
  X,
  AlertTriangle,
  CheckCircle2,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
interface User {
  id: number;
  name: string;
  email: string;
}

interface Camera {
  id: number;
  name: string;
  location: string;
  status: 'Online' | 'Offline';
}

interface Alert {
  id: number;
  cameraId: number;
  cameraName: string;
  message: string;
  timestamp: string;
}

// --- COMPONENTS ---

const LiveStream = ({ camera, onClose }: { camera: Camera; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Could not access camera. Please ensure permissions are granted.");
      }
    };

    startStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-8"
    >
      <div className="relative w-full max-w-4xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-medium text-white">{camera.name} — Live Feed</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="aspect-video bg-zinc-950 flex items-center justify-center">
          {error ? (
            <div className="text-center p-6">
              <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
              <p className="text-zinc-400">{error}</p>
              <p className="text-xs text-zinc-600 mt-2">Simulating placeholder feed...</p>
              <div className="mt-6 w-full h-full absolute inset-0 opacity-20 pointer-events-none">
                 <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-transparent animate-pulse" />
              </div>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="p-4 bg-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><MapPin size={14} /> {camera.location}</span>
            <span className="flex items-center gap-1"><Activity size={14} /> 1080p • 30fps</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded bg-zinc-700 text-zinc-300">REC</div>
            <span className="font-mono">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCamera, setActiveCamera] = useState<Camera | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [cameraForm, setCameraForm] = useState({ name: '', location: 'Front Door' });

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
      setView('dashboard');
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [camRes, alertRes] = await Promise.all([
        fetch('/cameras', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/alerts', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (camRes.ok) setCameras(await camRes.json());
      if (alertRes.ok) setAlerts(await alertRes.json());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const endpoint = view === 'login' ? '/auth/login' : '/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (view === 'login') {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setView('dashboard');
        } else {
          setView('login');
          setError("Registration successful! Please login.");
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/cameras', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cameraForm)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setCameraForm({ name: '', location: 'Front Door' });
        fetchData();
      }
    } catch (err) {
      console.error("Add camera error:", err);
    }
  };

  const handleDeleteCamera = async (id: number) => {
    if (!confirm("Are you sure you want to remove this camera?")) return;
    try {
      const res = await fetch(`/cameras/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete camera error:", err);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
  };

  if (view !== 'dashboard') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 selection:bg-emerald-500/30">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Shield className="text-emerald-500" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Sentinel Home</h1>
            <p className="text-zinc-500 mt-2">Advanced Surveillance Dashboard</p>
          </div>

          <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6">
              {view === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>

            {error && (
              <div className={cn(
                "p-3 rounded-xl mb-6 text-sm flex items-center gap-3",
                error.includes("successful") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}>
                {error.includes("successful") ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-gap-4 flex flex-col gap-4">
              {view === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    placeholder="John Doe"
                    value={authForm.name}
                    onChange={e => setAuthForm({...authForm, name: e.target.value})}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="name@example.com"
                  value={authForm.email}
                  onChange={e => setAuthForm({...authForm, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-4"
              >
                {loading ? 'Processing...' : (view === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => {
                  setView(view === 'login' ? 'register' : 'login');
                  setError(null);
                }}
                className="text-zinc-500 hover:text-emerald-400 text-sm transition-colors"
              >
                {view === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Shield className="text-zinc-950" size={18} />
              </div>
              <span className="text-white font-bold tracking-tight hidden sm:block">SENTINEL</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/5">
                <User size={14} className="text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400">{user?.name}</span>
              </div>
              <button 
                onClick={logout}
                className="p-2 hover:bg-red-500/10 rounded-full transition-colors text-zinc-500 hover:text-red-400"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
              <button className="md:hidden p-2 hover:bg-white/5 rounded-full">
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Cameras */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Active Cameras</h2>
                <p className="text-sm text-zinc-500 mt-1">{cameras.length} devices connected and monitoring</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
              >
                <Plus size={18} /> Add Camera
              </button>
            </div>

            {cameras.length === 0 ? (
              <div className="bg-zinc-900/50 border-2 border-dashed border-white/5 rounded-3xl p-12 text-center">
                <Camera className="mx-auto text-zinc-700 mb-4" size={48} />
                <h3 className="text-lg font-medium text-zinc-400">No cameras found</h3>
                <p className="text-sm text-zinc-600 mt-2">Add your first security camera to start monitoring your home.</p>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-6 text-emerald-500 hover:text-emerald-400 font-medium text-sm"
                >
                  Configure new device →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cameras.map(camera => (
                  <motion.div 
                    layout
                    key={camera.id}
                    className="group bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all shadow-xl"
                  >
                    <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full animate-pulse",
                          camera.status === 'Online' ? "bg-emerald-500" : "bg-red-500"
                        )} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">{camera.status}</span>
                      </div>
                      <div className="absolute bottom-3 left-3 z-20">
                        <h3 className="text-white font-semibold">{camera.name}</h3>
                        <div className="flex items-center gap-1 text-zinc-400 text-[10px] uppercase tracking-wider mt-0.5">
                          <MapPin size={10} /> {camera.location}
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 bg-black/40 backdrop-blur-sm">
                        <button 
                          onClick={() => setActiveCamera(camera)}
                          className="bg-white text-zinc-950 px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform"
                        >
                          <Video size={14} /> View Live
                        </button>
                      </div>
                      {/* Scanline effect */}
                      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                    </div>
                    <div className="p-4 flex items-center justify-between bg-zinc-900/50">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Signal</p>
                          <p className="text-xs text-white font-mono">98%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Storage</p>
                          <p className="text-xs text-white font-mono">2.4GB</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteCamera(camera.id)}
                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Alerts */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Bell className="text-amber-500" size={20} />
                  </div>
                  <h2 className="font-bold text-white">Security Alerts</h2>
                </div>
                <span className="text-[10px] font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-400 uppercase">Live</span>
              </div>
              
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="mx-auto text-zinc-700 mb-3" size={32} />
                    <p className="text-sm text-zinc-500">System secure. No recent alerts.</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} className="p-4 hover:bg-white/5 transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <div>
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            <span className="font-bold text-white">{alert.cameraName}</span>: {alert.message}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 bg-zinc-950/50 text-center">
                <button 
                  onClick={fetchData}
                  className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Refresh History
                </button>
              </div>
            </div>

            {/* System Status Widget */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider">System Status</h3>
                <Activity size={16} className="text-emerald-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Cloud Sync</span>
                  <span className="text-emerald-400 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Encryption</span>
                  <span className="text-emerald-400 font-medium">AES-256</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Uptime</span>
                  <span className="text-emerald-400 font-medium">99.9%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Camera Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Add New Camera</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddCamera} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Camera Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="e.g. Front Porch Cam"
                    value={cameraForm.name}
                    onChange={e => setCameraForm({...cameraForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Location</label>
                  <select 
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    value={cameraForm.location}
                    onChange={e => setCameraForm({...cameraForm, location: e.target.value})}
                  >
                    <option>Front Door</option>
                    <option>Garage</option>
                    <option>Living Room</option>
                    <option>Backyard</option>
                    <option>Kitchen</option>
                    <option>Driveway</option>
                  </select>
                </div>
                <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4">
                  Register Device
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Stream View */}
      <AnimatePresence>
        {activeCamera && (
          <LiveStream 
            camera={activeCamera} 
            onClose={() => setActiveCamera(null)} 
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">
            Sentinel Home Security Systems • v1.0.4
          </p>
        </div>
      </footer>
    </div>
  );
}
