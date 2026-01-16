import { createClient } from '@supabase/supabase-js';
import { Order, Product } from '../types';

// Priority: Environment Variable -> LocalStorage -> Empty
const SUPABASE_URL = process.env.SUPABASE_URL || localStorage.getItem('linePlusOne_supabaseUrl') || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || localStorage.getItem('linePlusOne_supabaseKey') || '';

const isConfigured = SUPABASE_URL && SUPABASE_KEY;

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

export const DatabaseService = {
  isReady: !!supabase,

  // --- Orders ---
  async fetchOrders(): Promise<{ data: Order[], error: any }> {
    if (!supabase) return { data: [], error: 'No client' };
    const { data, error } = await supabase
      .from('orders')
      .select('body');
    
    if (error) {
      console.error('Error fetching orders:', error);
      return { data: [], error };
    }
    return { data: data.map((row: any) => row.body), error: null };
  },

  async upsertOrders(orders: Order[]) {
    if (!supabase || orders.length === 0) return;
    
    // Map to table structure: { id, body }
    const rows = orders.map(o => ({
      id: o.id,
      body: o
    }));

    const { error } = await supabase
      .from('orders')
      .upsert(rows, { onConflict: 'id' });

    if (error) console.error('Error saving orders:', error);
  },

  // --- Products ---
  async fetchProducts(): Promise<{ data: Product[], error: any }> {
    if (!supabase) return { data: [], error: 'No client' };
    const { data, error } = await supabase
      .from('products')
      .select('body');

    if (error) {
      console.error('Error fetching products:', error);
      return { data: [], error };
    }
    return { data: data.map((row: any) => row.body), error: null };
  },

  async upsertProducts(products: Product[]) {
    if (!supabase || products.length === 0) return;

    const rows = products.map(p => ({
      id: p.id,
      body: p
    }));

    const { error } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'id' });

    if (error) console.error('Error saving products:', error);
  }
};
