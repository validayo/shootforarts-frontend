import React from "react";

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`}
  />
);

export default Skeleton;
