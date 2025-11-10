import React from 'react';
import { motion } from 'framer-motion';

interface CategoryFilterProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  activeCategory,
  setActiveCategory,
}) => {
  const categories = ['ALL', 'PORTRAITS', 'EVENTS', 'WEDDINGS', 'EXTRAS'];

  
  return (
    <motion.div 
      className="flex justify-center mb-8 px-4 md:px-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <div className="inline-flex flex-wrap justify-center gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`${
              activeCategory === category
                ? 'bg-blue-100 text-blue-600'
                : 'text-primary hover:bg-gray-100'
            } px-4 py-1.5 text-sm md:text-base rounded-full transition-all duration-300`}
          >
            {category.toLowerCase()}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default CategoryFilter;
