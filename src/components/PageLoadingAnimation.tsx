import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

interface PageLoadingAnimationProps {
  message?: string;
}

export function PageLoadingAnimation({ message = "Carregando..." }: PageLoadingAnimationProps) {
  return (
    <div className="min-h-screen flex items-center justify-center" 
         style={{
           backgroundColor: '#F6F6F6',
           backgroundImage: `
             radial-gradient(ellipse 800px 400px at 80% 10%, rgba(255, 237, 213, 0.15) 0%, rgba(254, 215, 170, 0.08) 35%, transparent 70%),
             radial-gradient(ellipse 600px 300px at 75% 5%, rgba(255, 228, 196, 0.1) 0%, transparent 50%)
           `
         }}>
      <div className="text-center">
        {/* Logo animado */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="relative mx-auto w-16 h-16 mb-4"
            animate={{ 
              rotateY: [0, 360],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </motion.div>
        </motion.div>

        {/* Spinner personalizado */}
        <motion.div
          className="relative mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-12 h-12 mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full border-4 border-gray-200 rounded-full">
              <div className="w-full h-full border-4 border-transparent border-t-blue-500 rounded-full"></div>
            </div>
          </motion.div>
        </motion.div>

        {/* Mensagem animada */}
        <motion.p 
          className="text-gray-600 text-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {message}
        </motion.p>

        {/* Pontos animados */}
        <motion.div
          className="flex justify-center gap-1 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}