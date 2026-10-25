import React from 'react';

const colorMap = {
  // Roles
  admin: 'bg-[#2E2836] text-[#F3EEFA] border-[#4A4157]',
  faculty: 'bg-[#3A2B1D] text-[#FDF5EE] border-[#664D35]',
  organizer: 'bg-[#21344D] text-[#E8F1FC] border-[#3E5C85]',
  student: 'bg-[#1E3E34] text-[#E7F6F0] border-[#356B5B]',
  
  // Event Types & Categories
  Technical: 'bg-[#EEF3FA] text-[#24426E] border-[#D4E0F0]',
  Cultural: 'bg-[#FDF2F0] text-[#B93827] border-[#F5D5D0]',
  Sports: 'bg-[#EEF7F3] text-[#237A57] border-[#D3EBE0]',
  Workshop: 'bg-[#FEF5EE] text-[#9C4221] border-[#F6DACB]',
  Competition: 'bg-[#FAF4ED] text-[#8C5E1B] border-[#EEDDC4]',
  Seminar: 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]',
  Fest: 'bg-[#FDF2F0] text-[#D94B35] border-[#F2D3CD]',

  // Status
  published: 'bg-[#EBF4F0] text-[#237A57] border-[#CCE4D9]',
  registered: 'bg-[#EBF4F0] text-[#237A57] border-[#CCE4D9]',
  completed: 'bg-[#EFEEE8] text-[#5A5952] border-[#DDDBCF]',
  cancelled: 'bg-[#FDF2F2] text-[#B93838] border-[#F4D0D0]',
  ongoing: 'bg-[#EEF3FA] text-[#24426E] border-[#D4E0F0]',
  draft: 'bg-[#FDF6EC] text-[#A96912] border-[#F5E4CA]',
  active: 'bg-[#EBF4F0] text-[#237A57] border-[#CCE4D9]',
  inactive: 'bg-[#EFEEE8] text-[#77766F] border-[#DDDBCF]',
  winner: 'bg-[#FAF4ED] text-[#A96912] border-[#EEDDC4]',
  assigned: 'bg-[#EEF3FA] text-[#24426E] border-[#D4E0F0]',
  applied: 'bg-[#EFEEE8] text-[#5A5952] border-[#DDDBCF]',
};

export default function Badge({ children, variant, className = '' }) {
  const style = colorMap[variant] || 'bg-[#EFEEE8] text-[#353535] border-[#E2E0D8]';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide border ${style} ${className}`}
    >
      {children}
    </span>
  );
}
