// Generate GR number
const generateGrNo = (count) => {
  return `GR${String(count + 1).padStart(6, '0')}`;
};

// Calculate freight
const calculateFreight = (chargeWeight, ratePerKg = 5) => {
  return chargeWeight * ratePerKg;
};

// Validate package weight
const validatePackageWeight = (noOfPckgs, chargeWeight, packingMaxWeight) => {
  if (noOfPckgs <= 0) return { isValid: true };
  const perPackageWeight = chargeWeight / noOfPckgs;
  if (perPackageWeight > packingMaxWeight) {
    return {
      isValid: false,
      error: `Per package weight (${perPackageWeight.toFixed(2)} kg) exceeds limit (${packingMaxWeight} kg/package)`
    };
  }
  return { isValid: true };
};

// Format date
const formatDate = (date, format = 'dd-MM-yyyy') => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  if (format === 'dd-MM-yyyy') return `${day}-${month}-${year}`;
  if (format === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
};

module.exports = {
  generateGrNo,
  calculateFreight,
  validatePackageWeight,
  formatDate
};