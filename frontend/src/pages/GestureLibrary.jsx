import { motion } from 'framer-motion';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GestureCard } from '@/components/gestures/GestureCard';
import { MovementGestureCard } from '@/components/gestures/MovementGestureCard';
import { staticGestures, movementGestures } from '@/data/mockData';
import { Hand, Move, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function GestureLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [localStaticGestures, setLocalStaticGestures] = useState(staticGestures);
  const [localMovementGestures, setLocalMovementGestures] = useState(movementGestures);

  const handleToggleStatic = (id) => {
    setLocalStaticGestures(prev =>
      prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g)
    );
  };

  const handleToggleMovement = (id) => {
    setLocalMovementGestures(prev =>
      prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g)
    );
  };

  const handleSensitivityChange = (id, value) => {
    setLocalMovementGestures(prev =>
      prev.map(g => g.id === id ? { ...g, sensitivity: value } : g)
    );
  };

  const filteredStaticGestures = localStaticGestures.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMovementGestures = localMovementGestures.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Gesture Library
        </h1>
        <p className="text-muted-foreground mb-6">Manage your static and movement gestures</p>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search gestures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#18181B] border-white/10 focus:border-violet-500/50"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="static" className="w-full">
        <TabsList className="mb-8 bg-[#18181B] border border-white/10">
          <TabsTrigger value="static" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
            <Hand className="w-4 h-4 mr-2" />
            Static Gestures ({filteredStaticGestures.length})
          </TabsTrigger>
          <TabsTrigger value="movement" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
            <Move className="w-4 h-4 mr-2" />
            Movement Gestures ({filteredMovementGestures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="static">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredStaticGestures.map((gesture, index) => (
              <motion.div
                key={gesture.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GestureCard
                  gesture={gesture}
                  onToggle={handleToggleStatic}
                  onEdit={(g) => console.log('Edit', g)}
                  onDelete={(id) => console.log('Delete', id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="movement">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {filteredMovementGestures.map((gesture, index) => (
              <motion.div
                key={gesture.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <MovementGestureCard
                  gesture={gesture}
                  onToggle={handleToggleMovement}
                  onSensitivityChange={handleSensitivityChange}
                  onEdit={(g) => console.log('Edit', g)}
                  onDelete={(id) => console.log('Delete', id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}