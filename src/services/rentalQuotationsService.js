/**
 * Rental Quotations Service
 * CRUD for v1_rentals_quotations — rental-specific quotation calculator saves.
 * Imported by: App.js (rental quotation state/functions)
 */

import { supabase, Tables } from '../lib/supabase';
import * as simpleAuth from '../utils/simpleAuth';

async function _getUserId() {
  try {
    const currentUser = simpleAuth.getCurrentUser();
    if (!currentUser?.email) return null;
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', currentUser.email)
      .single();
    return data?.id || null;
  } catch {
    return null;
  }
}

const rentalQuotationsService = {
  async listRentalQuotations() {
    const { data, error } = await supabase
      .from(Tables.RENTALS_QUOTATIONS)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(_transform);
  },

  async getRentalQuotation(id) {
    const { data, error } = await supabase
      .from(Tables.RENTALS_QUOTATIONS)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return _transform(data);
  },

  async saveRentalQuotation(quotationData) {
    if (quotationData.id) {
      return _update(quotationData.id, quotationData);
    }
    return _create(quotationData);
  },

  async deleteRentalQuotation(id) {
    const { error } = await supabase
      .from(Tables.RENTALS_QUOTATIONS)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  },
};

async function _create(data) {
  const currentUser = simpleAuth.getCurrentUser();
  if (!currentUser) throw new Error('Please log in to save quotations');
  const userId = await _getUserId();

  const { data: row, error } = await supabase
    .from(Tables.RENTALS_QUOTATIONS)
    .insert([{
      user_id: userId,
      created_by_username: currentUser.username,
      created_by_email: currentUser.email,
      created_by_role: currentUser.role,
      project_name: data.projectName,
      client_name: data.clientName,
      currency: data.currency || 'JOD',
      custom_equipment: data.customEquipment || [],
      technical_rider: data.technicalRider || [],
      custom_services: data.customServices || [],
      global_discount: data.globalDiscount || 0,
      total: data.total || 0,
      include_tax: data.includeTax ?? true,
      terms: data.terms || '',
      is_calculated: data.isCalculated || false,
      calculation_results: data.calculationResults || null,
    }])
    .select()
    .single();
  if (error) throw error;
  return { success: true, id: row.id, message: 'Rental quotation saved' };
}

async function _update(id, data) {
  const { error } = await supabase
    .from(Tables.RENTALS_QUOTATIONS)
    .update({
      project_name: data.projectName,
      client_name: data.clientName,
      currency: data.currency || 'JOD',
      custom_equipment: data.customEquipment || [],
      technical_rider: data.technicalRider || [],
      custom_services: data.customServices || [],
      global_discount: data.globalDiscount || 0,
      total: data.total || 0,
      include_tax: data.includeTax ?? true,
      terms: data.terms || '',
      is_calculated: data.isCalculated || false,
      calculation_results: data.calculationResults || null,
    })
    .eq('id', id);
  if (error) throw error;
  return { success: true, id, message: 'Rental quotation updated' };
}

function _transform(row) {
  if (!row) return null;
  return {
    ...row,
    projectName: row.project_name,
    clientName: row.client_name,
    globalDiscount: row.global_discount,
    includeTax: row.include_tax,
    isCalculated: row.is_calculated,
    calculationResults: row.calculation_results,
    customEquipment: row.custom_equipment || [],
    technicalRider: row.technical_rider || [],
    customServices: row.custom_services || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export default rentalQuotationsService;
