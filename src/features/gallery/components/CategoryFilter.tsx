import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GALLERY_FILTER_ITEMS } from "../../../config/portfolioCategoryPages.js";

interface CategoryFilterProps {
  activeCategory: string;
  onCategorySelect: (category: string) => void;
}

const getFilterClassName = (isActive: boolean) =>
  `${isActive ? "bg-blue-100 text-blue-600" : "text-primary hover:bg-gray-100"} px-4 py-1.5 text-sm md:text-base rounded-full transition-all duration-300`;

const CategoryFilter: React.FC<CategoryFilterProps> = ({ activeCategory, onCategorySelect }) => (
  <motion.div
    className="mb-8 flex justify-center px-4 md:px-0"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.5 }}
  >
    <div className="inline-flex flex-wrap justify-center gap-2">
      {GALLERY_FILTER_ITEMS.map((item) => {
        const className = getFilterClassName(activeCategory === item.category);
        if (item.path) {
          return (
            <Link key={item.category} to={item.path} state={null} className={className}>
              {item.label}
            </Link>
          );
        }

        return (
          <button key={item.category} type="button" onClick={() => onCategorySelect(item.category)} className={className}>
            {item.label}
          </button>
        );
      })}
    </div>
  </motion.div>
);

export default CategoryFilter;
