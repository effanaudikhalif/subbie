import React from 'react';
import Link from 'next/link';

interface ListingCardProps {
  id: string;
  image: string;
  title: string;
  city: string;
  state: string;
  description: string;
  pricePerNight: number;
  href?: string;
}

const ListingCard: React.FC<ListingCardProps> = ({
  id,
  image,
  title,
  city,
  state,
  description,
  pricePerNight,
  href
}) => {
  return (
    <Link href={href || `/listings/${id}`} className=" bg-white rounded-2xl shadow p-4 flex flex-col hover:shadow-lg transition-shadow border border-gray-200">
      <div className="relative mb-3">
        <img src={image} alt={title} className="rounded-xl w-full h-48 object-cover" />
      </div>
      <div className="font-semibold text-lg mb-1">{title}</div>
      <div className="text-gray-500 text-sm mb-1">{city}, {state}</div>
      <div className="text-gray-500 text-sm mb-2">{description}</div>
      <div className="flex items-center text-sm mb-2">
        <span className="font-bold text-black mr-1">${pricePerNight.toFixed(2)}</span>
        <span className="text-gray-500">for 1 night</span>
      </div>
    </Link>
  );
};

export default ListingCard; 