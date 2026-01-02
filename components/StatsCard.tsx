import React from 'react';
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';
import { Order } from '../types';

interface StatsCardProps {
  orders: Order[];
}

const StatsCard: React.FC<StatsCardProps> = ({ orders }) => {
  const totalOrders = orders.length;
  const uniqueBuyers = new Set(orders.map(o => o.buyerName)).size;
  const totalQuantity = orders.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalRevenue = orders.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <ShoppingBag size={20} />
        </div>
        <div>
          <p className="text-sm text-gray-500">總訂單數</p>
          <p className="text-xl font-bold text-gray-800">{totalOrders}</p>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
          <Users size={20} />
        </div>
        <div>
          <p className="text-sm text-gray-500">下單人數</p>
          <p className="text-xl font-bold text-gray-800">{uniqueBuyers}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
          <TrendingUp size={20} />
        </div>
        <div>
          <p className="text-sm text-gray-500">總件數</p>
          <p className="text-xl font-bold text-gray-800">{totalQuantity}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
          <DollarSign size={20} />
        </div>
        <div>
          <p className="text-sm text-gray-500">預估營收</p>
          <p className="text-xl font-bold text-gray-800">${totalRevenue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;