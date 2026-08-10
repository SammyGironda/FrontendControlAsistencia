import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { login } from '../../api/auth';
import useAuthStore from '../../store/authStore';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      setAuth(data.token, data.usuario);
      navigate('/');
    } catch {
      setError('Usuario o contraseña incorrectos. Intente de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans">
      {/* Left Side */}
      <div className="hidden lg:flex flex-col items-center justify-between w-3/5 bg-[#03178C] p-8 text-white">
        <div className="w-full"></div>
        <div className="text-center">
          <h1 className="text-5xl font-bold">RRHH Bolivia</h1>
          <p className="mt-2 text-lg text-gray-300">Sistema de Gestión de Personal</p>
        </div>
        <div className="w-full text-center">
          <p className="text-sm text-gray-400">v10.0</p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center justify-center w-full lg:w-2/5 bg-white p-8">
        <div className="w-full max-w-sm">
          <div className="text-center lg:text-left">
            <h2 className="text-lg font-medium text-gray-800">Bienvenido</h2>
            <p className="mt-1 text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="username">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D9A404] focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D9A404] focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D9A404] text-[#03178C] font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D9A404] flex items-center justify-center transition-colors duration-200"
            >
              {loading ? (
                <LoaderCircle className="w-6 h-6 animate-spin" />
              ) : (
                'Ingresar'
              )}
            </button>

            {error && (
              <p className="mt-4 text-sm text-center text-red-600">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
