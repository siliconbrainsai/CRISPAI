import React from 'react';

const EmptyState = ({ children }) => {
  return <div>{children || 'EmptyState'}</div>;
};

export default EmptyState;
