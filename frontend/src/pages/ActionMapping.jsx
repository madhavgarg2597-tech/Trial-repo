import { motion } from 'framer-motion';
import { useState } from 'react';
import { Search, Zap, Keyboard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { availableActions, staticGestures, movementGestures } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function ActionMapping() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const allGestures = [...staticGestures, ...movementGestures];

  const categories = ['all', ...new Set(availableActions.map(a => a.category))];
  
  const filteredActions = availableActions.filter(action => {
    const matchesSearch = action.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedActions = filteredActions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Action Mapping
        </h1>
        <p className="text-muted-foreground">Map gestures to keyboard shortcuts and system commands</p>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#18181B] border-white/10 focus:border-violet-500/50"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48 bg-[#18181B] border-white/10 focus:border-violet-500/50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181B] border-white/10">
            {categories.map(cat => (
              <SelectItem key={cat} value={cat} className="text-white hover:bg-violet-500/20 capitalize">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions Grid */}
      <div className="space-y-8">
        {Object.entries(groupedActions).map(([category, actions]) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Zap className="w-5 h-5 text-violet-400" />
              {category}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {actions.map((action, index) => {
                const mappedGesture = allGestures.find(g => g.action === action.label);
                
                return (
                  <motion.div
                    key={action.value}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group p-4 rounded-xl bg-[#18181B] border border-white/5 hover:border-violet-500/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white mb-1">{action.label}</h3>
                        {mappedGesture && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
                              <span className="text-xs font-medium text-violet-400">{mappedGesture.name}</span>
                            </div>
                            {mappedGesture.keyBinding && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
                                <Keyboard className="w-3 h-3 text-muted-foreground" />
                                <code className="text-xs font-mono text-muted-foreground">{mappedGesture.keyBinding}</code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {mappedGesture ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-violet-500/20 hover:text-violet-400"
                        >
                          Change Gesture
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/10 text-white hover:bg-red-500/20 hover:text-red-400"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30"
                      >
                        Assign Gesture
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}