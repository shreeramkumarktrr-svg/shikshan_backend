const { sequelize } = require('../models');

/**
 * Custom ID Generator for Shikshan Platform
 * 
 * ID Patterns:
 * - Schools: sch2500001 (sch + year + 5-digit serial)
 * - Users: usr2500001 (usr + year + 5-digit serial)
 * - Students: std2500001 (std + year + 5-digit serial)
 * - Teachers: tch2500001 (tch + year + 5-digit serial)
 * - Classes: cls2500001 (cls + year + 5-digit serial)
 * - Events: evt2500001 (evt + year + 5-digit serial)
 * - Fees: fee2500001 (fee + year + 5-digit serial)
 * - Payments: pay2500001 (pay + year + 5-digit serial)
 * - Complaints: cmp2500001 (cmp + year + 5-digit serial)
 * - Homework: hmw2500001 (hmw + year + 5-digit serial)
 * - Attendance: att2500001 (att + year + 5-digit serial)
 * - Subscriptions: sub2500001 (sub + year + 5-digit serial)
 * - Inquiries: inq2500001 (inq + year + 5-digit serial)
 */

const ID_PREFIXES = {
  schools: 'sch',
  users: 'usr',
  students: 'std',
  teachers: 'tch',
  parents: 'par',
  classes: 'cls',
  events: 'evt',
  fees: 'fee',
  payments: 'pay',
  complaints: 'cmp',
  homework: 'hmw',
  attendance: 'att',
  subscriptions: 'sub',
  inquiries: 'inq',
  staffattendance: 'sta'
};

/**
 * Get current year in 2-digit format (25 for 2025)
 */
function getCurrentYear() {
  return new Date().getFullYear().toString().slice(-2);
}

/**
 * Generate next serial number for a given table and year
 */
async function getNextSerialNumber(tableName, year) {
  try {
    const prefix = ID_PREFIXES[tableName.toLowerCase()];
    if (!prefix) {
      throw new Error(`No prefix defined for table: ${tableName}`);
    }

    const pattern = `${prefix}${year}%`;
    
    // Query to find the highest existing ID for this year
    const [results] = await sequelize.query(`
      SELECT id FROM "${tableName}" 
      WHERE id LIKE :pattern 
      ORDER BY id DESC 
      LIMIT 1
    `, {
      replacements: { pattern },
      type: sequelize.QueryTypes.SELECT
    });

    if (results.length === 0) {
      // First ID for this year
      return 1;
    }

    // Extract serial number from the last ID
    const lastId = results[0].id;
    const serialPart = lastId.slice(-5); // Last 5 digits
    const lastSerial = parseInt(serialPart, 10);
    
    return lastSerial + 1;
  } catch (error) {
    console.error('Error getting next serial number:', error);
    // Fallback to timestamp-based serial
    return Math.floor(Date.now() / 1000) % 100000;
  }
}

/**
 * Generate custom ID for a given table
 */
async function generateCustomId(tableName) {
  try {
    const prefix = ID_PREFIXES[tableName.toLowerCase()];
    if (!prefix) {
      throw new Error(`No prefix defined for table: ${tableName}`);
    }

    const year = getCurrentYear();
    const serial = await getNextSerialNumber(tableName, year);
    
    // Format serial number with leading zeros (5 digits)
    const formattedSerial = serial.toString().padStart(5, '0');
    
    return `${prefix}${year}${formattedSerial}`;
  } catch (error) {
    console.error('Error generating custom ID:', error);
    // Fallback to UUID-like format
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${ID_PREFIXES[tableName.toLowerCase()] || 'gen'}${timestamp}${random}`;
  }
}

/**
 * Generate admission number for students
 * Format: ADM25001 (ADM + year + 3-digit serial)
 */
async function generateAdmissionNumber() {
  try {
    const year = getCurrentYear();
    const pattern = `ADM${year}%`;
    
    const [results] = await sequelize.query(`
      SELECT "admissionNumber" FROM students 
      WHERE "admissionNumber" LIKE :pattern 
      ORDER BY "admissionNumber" DESC 
      LIMIT 1
    `, {
      replacements: { pattern },
      type: sequelize.QueryTypes.SELECT
    });

    let serial = 1;
    if (results.length > 0) {
      const lastAdmissionNumber = results[0].admissionNumber;
      const serialPart = lastAdmissionNumber.slice(-3); // Last 3 digits
      serial = parseInt(serialPart, 10) + 1;
    }

    const formattedSerial = serial.toString().padStart(3, '0');
    return `ADM${year}${formattedSerial}`;
  } catch (error) {
    console.error('Error generating admission number:', error);
    return `ADM${getCurrentYear()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }
}

/**
 * Generate employee ID for staff
 * Format: EMP25001 (EMP + year + 3-digit serial)
 */
async function generateEmployeeId() {
  try {
    const year = getCurrentYear();
    const pattern = `EMP${year}%`;
    
    const [results] = await sequelize.query(`
      SELECT "employeeId" FROM users 
      WHERE "employeeId" LIKE :pattern 
      ORDER BY "employeeId" DESC 
      LIMIT 1
    `, {
      replacements: { pattern },
      type: sequelize.QueryTypes.SELECT
    });

    let serial = 1;
    if (results.length > 0) {
      const lastEmployeeId = results[0].employeeId;
      const serialPart = lastEmployeeId.slice(-3); // Last 3 digits
      serial = parseInt(serialPart, 10) + 1;
    }

    const formattedSerial = serial.toString().padStart(3, '0');
    return `EMP${year}${formattedSerial}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    return `EMP${getCurrentYear()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }
}

/**
 * Validate custom ID format
 */
function validateCustomId(id, tableName) {
  const prefix = ID_PREFIXES[tableName.toLowerCase()];
  if (!prefix) return false;
  
  const pattern = new RegExp(`^${prefix}\\d{7}$`);
  return pattern.test(id);
}

/**
 * Extract information from custom ID
 */
function parseCustomId(id) {
  if (id.length < 10) return null;
  
  const prefix = id.slice(0, 3);
  const year = id.slice(3, 5);
  const serial = id.slice(5);
  
  return {
    prefix,
    year: `20${year}`,
    serial: parseInt(serial, 10),
    fullYear: `20${year}`
  };
}

module.exports = {
  generateCustomId,
  generateAdmissionNumber,
  generateEmployeeId,
  validateCustomId,
  parseCustomId,
  ID_PREFIXES,
  getCurrentYear
};