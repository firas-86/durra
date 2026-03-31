import React from "react";

export default function Logo({ className = "", noShadow = false }: { className?: string, noShadow?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 360 180" 
        className={`w-48 h-auto ${noShadow ? '' : 'drop-shadow-md'}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Red Oval with White Border */}
        <ellipse cx="180" cy="105" rx="170" ry="65" fill="#ED1C24" stroke="#ffffff" strokeWidth="10" />
        
        {/* White Diamond Profile */}
        <polygon points="150,20 210,20 230,45 180,80 130,45" fill="#ffffff" />
        
        {/* Durra Text */}
        <text x="175" y="135" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontSize="85" fill="#ffffff" textAnchor="middle" letterSpacing="-2">
          Durra
        </text>
        
        {/* Registered Trademark Symbol */}
        <text x="288" y="80" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="24" fill="#ffffff">
          ®
        </text>
      </svg>
    </div>
  );
}
