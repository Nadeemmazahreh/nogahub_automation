/**
 * Validation Schemas
 * Input validation using Zod to ensure data integrity and security
 */

import { z } from 'zod';

/**
 * Equipment Item Schema
 */
export const equipmentItemSchema = z.object({
  code: z.string().min(1, 'Equipment code is required'),
  name: z.string().min(1, 'Equipment name is required'),
  quantity: z.number().positive('Quantity must be positive').int('Quantity must be an integer'),
  msrpUSD: z.number().nonnegative('MSRP cannot be negative').optional(),
  dealerPriceUSD: z.number().nonnegative('Dealer price cannot be negative').optional(),
  weightKg: z.number().nonnegative('Weight cannot be negative').optional(),
  taxCode: z.string().optional(),
  category: z.enum(['void', 'accessory']).optional(),
});

/**
 * Custom Equipment Item Schema
 */
export const customEquipmentItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive').int('Quantity must be an integer'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
});

/**
 * Services Schema
 */
export const servicesSchema = z.object({
  commissioning: z.boolean(),
  noiseControl: z.boolean(),
  soundDesign: z.boolean(),
  projectManagement: z.boolean(),
});

/**
 * Project Schema
 */
export const projectSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').max(200, 'Project name is too long'),
  clientName: z.string().min(1, 'Client name is required').max(200, 'Client name is too long'),
  equipment: z.array(equipmentItemSchema),
  customEquipment: z.array(customEquipmentItemSchema),
  services: servicesSchema,
  includeTax: z.boolean(),
  globalDiscount: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%'),
});

/**
 * Noise Control Item Schema
 */
export const noiseControlItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive').int('Quantity must be an integer'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
});

/**
 * Noise Control Project Schema
 */
export const noiseControlProjectSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').max(200, 'Project name is too long'),
  clientName: z.string().min(1, 'Client name is required').max(200, 'Client name is too long'),
  items: z.array(noiseControlItemSchema),
  services: z.object({
    noiseControl: z.object({
      enabled: z.boolean(),
      useCustomValue: z.boolean(),
      customValue: z.number().nonnegative('Custom value cannot be negative'),
    }),
  }),
});

/**
 * Login Credentials Schema
 */
export const loginCredentialsSchema = z.object({
  username: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Validate data against a schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {Object} - { success: boolean, data?: any, errors?: array }
 */
export const validateData = (schema, data) => {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Validation failed' }],
    };
  }
};

/**
 * Validate data against a schema and throw error if invalid
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {any} - Validated data
 * @throws {Error} - If validation fails
 */
export const validateOrThrow = (schema, data) => {
  const result = validateData(schema, data);
  if (!result.success) {
    const errorMessages = result.errors.map((err) => `${err.field}: ${err.message}`).join(', ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }
  return result.data;
};
