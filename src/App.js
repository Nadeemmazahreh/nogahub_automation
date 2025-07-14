import React, { useState, useEffect } from 'react';
import { Calculator, Users, FileText, TrendingUp, LogIn, LogOut, Plus, Trash2, RefreshCw, Download, Building2, Zap, Save, FolderOpen } from 'lucide-react';
import apiService from './services/api';

const NogaHubAutomation = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '', isSignup: false });
  const [activeTab, setActiveTab] = useState('quotation');
  const [activeSection, setActiveSection] = useState('installation');
  const [isCalculated, setIsCalculated] = useState(false);
  const [calculationResults, setCalculationResults] = useState(null);
  const [savedProjects, setSavedProjects] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // NogaHub Logo Component
  const NogaHubLogo = ({ size = 100, className = "" }) => (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/logo-no-background.png" 
        alt="NogaHub Logo" 
        width={size} 
        height={size} 
        className="mr-3 object-contain"
      />
    </div>
  );

  // Equipment data will be fetched from secure backend API
  const [equipmentDatabase, setEquipmentDatabase] = useState([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  const [project, setProject] = useState({
    clientName: '',
    projectName: '',
    equipment: [],
    globalDiscount: 0,
    services: {
      commissioning: false,
      noiseControl: false,
      soundDesign: false,
    },
    customServices: [],
    customEquipment: [],
    roles: {
      producer: '',
      projectManager: ''
    }
  });

  // Function to load saved projects from backend
  const loadSavedProjects = async () => {
    if (!apiService.isAuthenticated()) return;
    
    try {
      const response = await apiService.getProjects();
      setSavedProjects(response.projects || []);
    } catch (error) {
      console.error('Failed to load saved projects:', error);
      // No localStorage fallback to maintain user isolation
      setSavedProjects([]);
    }
  };

  // Check authentication status and load data on component mount
  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const profileResponse = await apiService.getProfile();
          setIsAuthenticated(true);
          setUserRole(profileResponse.user.role);
          await loadEquipmentData();
          await loadSavedProjects(); // Load projects after successful auth
        } catch (error) {
          console.error('Auth check failed:', error);
          setIsAuthenticated(false);
          setUserRole(null);
        }
      }
    };

    checkAuth();
  }, []);

  // Remove localStorage sync - projects are now stored in backend

  // Function to load equipment data from API
  const loadEquipmentData = async () => {
    if (!apiService.isAuthenticated()) return;
    
    try {
      setEquipmentLoading(true);
      const response = await apiService.getEquipment();
      setEquipmentDatabase(response.equipment || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      window.alert('Failed to load equipment data. Please check your connection.');
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Function to save current project
  const saveCurrentProject = async () => {
    if (project.projectName.trim() && project.clientName.trim() && (project.equipment.length > 0 || project.customEquipment.length > 0)) {
      if (!apiService.isAuthenticated()) {
        window.alert('Please log in to save projects.');
        return;
      }

      try {
        const projectData = {
          ...project,
          total: calculationResults ? (calculationResults.projectTotalJOD || calculationResults.totalCostUSD || 0) : 0,
          isCalculated: isCalculated,
          calculationResults: calculationResults
        };

        const response = await apiService.saveProject(projectData);
        
        // Reload projects from backend to get updated list
        await loadSavedProjects();
        
        setShowSaveModal(false);
        window.alert(response.message || 'Project saved successfully!');
      } catch (error) {
        console.error('Failed to save project:', error);
        window.alert('Failed to save project. Please try again.');
      }
    } else {
      window.alert('Please ensure project has a name, client name, and at least one equipment item before saving.');
    }
  };

  // Function to load saved project
  const loadSavedProject = (savedProject) => {
    setProject({
      clientName: savedProject.clientName || '',
      projectName: savedProject.projectName || '',
      equipment: savedProject.equipment || [],
      globalDiscount: savedProject.globalDiscount || 0,
      services: savedProject.services || { commissioning: false, noiseControl: false, soundDesign: false },
      customServices: savedProject.customServices || [],
      customEquipment: savedProject.customEquipment || [],
      roles: savedProject.roles || { producer: '', projectManager: '' }
    });
    if (savedProject.hasCalculation) {
      setIsCalculated(true);
      setCalculationResults(savedProject.calculationResults || null);
    } else {
      setIsCalculated(false);
      setCalculationResults(null);
    }
    setActiveTab('quotation');
    window.alert('Project loaded successfully!');
  };

  // Function to delete saved project
  const deleteSavedProject = async (projectId) => {
    if (!apiService.isAuthenticated()) {
      window.alert('Please log in to delete projects.');
      return;
    }

    try {
      await apiService.deleteProject(projectId);
      // Reload projects from backend to get updated list
      await loadSavedProjects();
      window.alert('Project deleted successfully!');
    } catch (error) {
      console.error('Failed to delete project:', error);
      window.alert('Failed to delete project. Please try again.');
    }
  };

  // Business entities structure based on the report
  const businessEntities = {
    nogahub: {
      name: "Nogahub",
      ownership: {
        nadeem: 0.40,
        issa: 0.40,
        wewealth: 0.20  // Being liquidated
      },
      services: ["Sound system design", "Acoustic consultancy", "Noise control studies"]
    },
    voidAcoustics: {
      name: "Void Acoustics Jordan",
      ownership: {
        nadeem: 0.50,
        issa: 0.225,
        omar: 0.225
      },
      services: ["Equipment sales", "Exclusive Void dealership"]
    },
    avecion: {
      name: "Avecion",
      ownership: {
        nadeem: 0.40,
        issa: 0.40,
        nogahub: 0.20
      },
      services: ["Web3 sound research", "Urban sound management"]
    }
  };

  // Authentication functions
  const handleLogin = async () => {
    try {
      const response = await apiService.login({
        email: loginData.username, // Using username field as email for now
        password: loginData.password
      });
      
      setIsAuthenticated(true);
      setUserRole(response.user.role);
      await loadEquipmentData();
      await loadSavedProjects(); // Load projects after successful login
      
    } catch (error) {
      console.error('Login failed:', error);
      window.alert('Login failed: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUserRole(null);
      setLoginData({ username: '', password: '', isSignup: false });
      setEquipmentDatabase([]);
    }
  };

  // Constants based on business report
  const exchangeRate = 0.71; // USD to JOD
  const shippingRatePerKg = 4.5; // JOD per kg

  // Service pricing based on business report percentages
  const servicePricing = {
    commissioning: 0.06, // 6% of equipment MSRP
    noiseControl: 0.10,  // 5-15% of equipment MSRP (using 10% average)
    soundDesign: 0.025,  // 0-5% of equipment MSRP (using 2.5% average)
    projectManagement: 0.10 // 10% of equipment MSRP
  };

  // Role-based fees from business report
  const roleFees = {
    producer: 0.05,      // 5% of total project value
    projectManager: 0.225, // 22.5% of total project value
    nogahubFee: 0.075    // 7.5% of total project value
  };

   // Updated calculation based on new logic
  const calculateProjectCosts = () => {
    if (project.equipment.length === 0 && project.customEquipment.length === 0) return null;

    // Step 1: First pass - calculate basic equipment totals
    let equipmentDealerTotalJOD = 0;
    let equipmentClientTotalJOD = 0;
    let totalWeight = 0;
    
    // First pass: calculate totals without shipping/customs
    project.equipment.forEach(item => {
      const equipment = equipmentDatabase.find(eq => eq.code === item.code);
      if (equipment && item.quantity > 0) {
        const dealerPriceJOD = equipment.dealerUSD * exchangeRate;
        const clientPriceJOD = equipment.clientUSD * exchangeRate;
        const dealerTotalJOD = dealerPriceJOD * item.quantity;
        const clientTotalJOD = clientPriceJOD * item.quantity;
        const weightTotal = equipment.weight * item.quantity;
        
        equipmentDealerTotalJOD += dealerTotalJOD;
        equipmentClientTotalJOD += clientTotalJOD;
        totalWeight += weightTotal;
      }
    });

    // Step 2: Calculate door-to-door cost for internal use (keeping old logic for profit calculations)
    const shippingCost = totalWeight * shippingRatePerKg;
    const clearanceCost = 35;
    const transportCost = 70;
    const deliveryOrderCost = 45;
    const totalShippingCost = shippingCost + clearanceCost + transportCost + deliveryOrderCost;
    
    const taxableAmount = equipmentDealerTotalJOD + totalShippingCost;
    const tax001 = taxableAmount * 0.05;
    const tax020 = (taxableAmount + tax001) * 0.16;
    const tax215 = equipmentDealerTotalJOD * 0.01;
    const tax301 = 50;
    const tax111 = shippingCost * 0.003;
    const tax016 = 23.2;
    const tax019 = 25;
    const tax070 = taxableAmount * 0.05;
    
    const totalCustoms = tax001 + tax020 + tax215 + tax301 + tax111 + tax016 + tax019 + tax070;
    const doorToDoorCostJOD = equipmentDealerTotalJOD + totalShippingCost + totalCustoms;
    console.log("equipmentDealerTotalJOD (JOD):", equipmentDealerTotalJOD);
    console.log("Total Customs (JOD):", totalCustoms);
    console.log("Total Shipping Cost (JOD):", totalShippingCost);
    console.log("Door to Door Cost (JOD):", doorToDoorCostJOD);

    // Step 3: Calculate shipping and customs shares based on total costs
    const shippingShare = totalShippingCost / equipmentDealerTotalJOD;
    const customsShare = totalCustoms / equipmentDealerTotalJOD;

    // Step 4: Second pass - calculate final equipment details with shipping/customs
    const equipmentDetails = project.equipment.map(item => {
      const equipment = equipmentDatabase.find(eq => eq.code === item.code);
      if (equipment && item.quantity > 0) {
        // Convert to JOD
        const dealerPriceJOD = equipment.dealerUSD * exchangeRate;
        const clientPriceJOD = equipment.clientUSD * exchangeRate;
        
        // Calculate shipping cost per unit (dealer cost × shipping share)
        const shippingPerUnit = dealerPriceJOD * shippingShare;
        
        // Calculate customs/clearance per unit (dealer cost × customs share)
        const customsPerUnit = dealerPriceJOD * customsShare;

        // Calculate final unit price (client price + shipping + customs)
        const finalUnitPriceJOD = clientPriceJOD + shippingPerUnit + customsPerUnit;
        
        // Calculate total for this item (final unit price × quantity)
        const finalTotalJOD = finalUnitPriceJOD * item.quantity;

        // Calculate totals for other purposes
        const dealerTotalJOD = dealerPriceJOD * item.quantity;
        const clientTotalJOD = clientPriceJOD * item.quantity;
        const weightTotal = equipment.weight * item.quantity;

        return {
          ...equipment,
          quantity: item.quantity,
          dealerPriceJOD: dealerPriceJOD,
          dealerPriceUSD: equipment.dealerUSD,
          clientPriceJOD: clientPriceJOD,
          dealerTotalJOD: dealerTotalJOD,
          clientTotalJOD: clientTotalJOD,
          weightTotal: weightTotal,
          shippingPerUnit: shippingPerUnit,
          customsPerUnit: customsPerUnit,
          finalUnitPriceJOD: finalUnitPriceJOD,
          finalTotalJOD: finalTotalJOD
        };
      }
      return null;
    }).filter(Boolean);

    // Step 5: Calculate totals without discount for BOQ
    const equipmentTotalJODBeforeDiscount = equipmentDetails.reduce((sum, item) => sum + item.finalTotalJOD, 0);
    console.log("Equipment Total JOD Before Discount:", equipmentTotalJODBeforeDiscount);
    // Keep original pricing for BOQ display (no discount applied)
    const equipmentDetailsFinal = equipmentDetails;
    
    // Apply global discount only for project summary calculations
    const globalDiscountMultiplier = (100 - project.globalDiscount) / 100;
    const equipmentTotalJOD = equipmentTotalJODBeforeDiscount * globalDiscountMultiplier;
    
    // Step 5.1: Process custom equipment (no discount applied, no shipping/customs)
    const customEquipmentDetails = project.customEquipment.map((equipment, index) => {
      if (equipment.name && equipment.price > 0 && equipment.weight > 0) {
        return {
          code: `CUSTOM-${index + 1}`,
          name: equipment.name,
          quantity: equipment.weight, // Using weight field as quantity
          dealerPriceJOD: equipment.price,
          clientPriceJOD: equipment.price,
          dealerTotalJOD: equipment.price * equipment.weight,
          clientTotalJOD: equipment.price * equipment.weight,
          weightTotal: 0, // Custom equipment has no physical weight
          shippingPerUnit: 0,
          customsPerUnit: 0,
          finalUnitPriceJOD: equipment.price,
          finalTotalJOD: equipment.price * equipment.weight,
          weight: 0,
          category: "custom"
        };
      }
      return null;
    }).filter(Boolean);

    // Calculate custom equipment totals
    const customEquipmentTotalJOD = customEquipmentDetails.reduce((sum, item) => sum + item.finalTotalJOD, 0);

    // Step 4: Calculate services based on equipment dealer cost percentages
    let servicesTotal = 0;
    
    if (project.services.commissioning) {
      servicesTotal += equipmentDealerTotalJOD * servicePricing.commissioning;
    }
    if (project.services.noiseControl) {
      servicesTotal += equipmentDealerTotalJOD * servicePricing.noiseControl;
    }
    if (project.services.soundDesign) {
      servicesTotal += equipmentDealerTotalJOD * servicePricing.soundDesign;
    }
    if (project.services.projectManagement) {
      servicesTotal += equipmentDealerTotalJOD * servicePricing.projectManagement;
    }
    
    project.customServices.forEach(service => {
      servicesTotal += service.price || 0;
    });

    // Step 5: Project totals (including custom equipment)
    const projectSubtotalJOD = equipmentTotalJOD + customEquipmentTotalJOD + servicesTotal;
    const projectTaxJOD = projectSubtotalJOD * 0.16; // 16% VAT
    const projectTotalJOD = projectSubtotalJOD + projectTaxJOD;

    // Step 6: Void profit calculations (based on business report)
    const voidSalesProfit = equipmentClientTotalJOD - equipmentDealerTotalJOD;
    
    // Step 7: Role-based fees
    const producerFee = voidSalesProfit * roleFees.producer;
    const pmFee = voidSalesProfit * roleFees.projectManager;
    const nogahubFee = voidSalesProfit * roleFees.nogahubFee;

    // Step 8: Void profit distribution (from business report)
    const voidRetainedEarnings = voidSalesProfit * 0.05; // 5%
    const voidShareholderDistribution = voidSalesProfit * 0.60; // 60%
    const voidExpenses = voidSalesProfit * 0.35; // Remaining 35% for expenses

    // Void shareholder distribution
    const nadeemVoidShare = voidShareholderDistribution * 0.55; // 55%
    const issaVoidShare = voidShareholderDistribution * 0.225; // 22.5%
    const bakriVoidShare = voidShareholderDistribution * 0.225; // 22.5%

    // Step 9: Nogahub profit distribution
    const nogahubExpenses = nogahubFee * 0.50; // 50% for expenses
    const nogahubProfit = nogahubFee * 0.50; // 50% profit
    
    // Nogahub shareholder distribution (40% Nadeem, 40% Issa, 20% Wewealth)
    const nadeemNogahubShare = nogahubProfit * 0.40;
    const issaNogahubShare = nogahubProfit * 0.40;
    const wewealthNogahubShare = nogahubProfit * 0.20;

    // Step 10: Calculate final individual totals
    const distribution = {
      nadeem: nadeemVoidShare + nadeemNogahubShare + 
              (project.roles.producer === 'Nadeem' ? producerFee : 0) + 
              (project.roles.projectManager === 'Nadeem' ? pmFee : 0),
      issa: issaVoidShare + issaNogahubShare + 
            (project.roles.producer === 'Issa' ? producerFee : 0) + 
            (project.roles.projectManager === 'Issa' ? pmFee : 0),
      bakri: bakriVoidShare + 
             (project.roles.producer === 'Bakri' ? producerFee : 0) + 
             (project.roles.projectManager === 'Bakri' ? pmFee : 0),
      omar: (project.roles.producer === 'Omar' ? producerFee : 0) + 
            (project.roles.projectManager === 'Omar' ? pmFee : 0),
      ammar: (project.roles.producer === 'Ammar' ? producerFee : 0) + 
             (project.roles.projectManager === 'Ammar' ? pmFee : 0),
      wewealth: wewealthNogahubShare
    };

    // Calculate equipment dealer total in USD for PO
    const equipmentDealerTotalUSD = project.equipment.reduce((sum, item) => {
      const equipment = equipmentDatabase.find(eq => eq.code === item.code);
      if (equipment && item.quantity > 0) {
        return sum + (equipment.dealerUSD * item.quantity);
      }
      return sum;
    }, 0);

    return {
      equipmentDetails: equipmentDetailsFinal,
      customEquipmentDetails,
      customEquipmentTotalJOD,
      equipmentDealerTotalJOD,
      equipmentDealerTotalUSD,
      equipmentClientTotalJOD,
      equipmentTotalJOD,
      equipmentTotalJODBeforeDiscount,
      doorToDoorCostJOD,
      totalWeight,
      servicesTotal,
      projectSubtotalJOD,
      projectTaxJOD,
      projectTotalJOD,
      voidSalesProfit,
      producerFee,
      pmFee,
      nogahubFee,
      distribution,
      breakdown: {
        voidRetainedEarnings,
        voidShareholderDistribution,
        voidExpenses,
        nogahubExpenses,
        nogahubProfit,
        nadeemVoidShare,
        issaVoidShare,
        bakriVoidShare,
        nadeemNogahubShare,
        issaNogahubShare,
        wewealthNogahubShare
      }
    };
  };

  // Handle calculate button
  const handleCalculate = () => {
    const results = calculateProjectCosts();
    if (results) {
      setCalculationResults(results);
      setIsCalculated(true);
    } else {
      alert('Please add equipment before calculating');
    }
  };

  // PDF Download function
  const downloadQuotationPDF = (calculationResults, project) => {
    const printContent = `
      <html>
        <head>
          <title>Quotation - ${project.projectName || 'Project'}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
              body { margin: 0; }
            }
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company-info { margin-bottom: 15px; font-size: 11px; }
            .project-info { margin-bottom: 15px; font-size: 11px; }
            .equipment-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
            .equipment-table th, .equipment-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            .equipment-table th { background-color: #f2f2f2; font-size: 11px; }
            .totals { margin-top: 15px; font-size: 12px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total-final { font-weight: bold; font-size: 13px; border-top: 2px solid #000; padding-top: 8px; }
            .discount { color: red; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="text-align: left; margin-bottom: 20px;">
              <img src="/logo-no-background.png" alt="NogaHub Logo" style="width: 80px; height: 80px; margin-bottom: 15px; object-fit: contain; display: block;" onerror="this.style.display='none'"/>
              <h1 style="margin: 0 0 10px 0; font-size: 1.8em;">QUOTATION</h1>
              <div class="company-info">
                <strong>Deep Sound For Technical Consultations</strong><br/>
                Housing Bank Complex 93 - Ground Floor 102<br/>
                Q. Nour St. - Welbdeh - Amman - Jordan<br/>
                Phone: +962 (0) 795144821
              </div>
            </div>
          </div>
          
          <div class="project-info">
            <strong>Client:</strong> ${project.clientName || 'Client Name'}<br/>
            <strong>Project:</strong> ${project.projectName || 'Project Name'}<br/>
            <strong>Date:</strong> ${new Date().toLocaleDateString()}<br/>
          </div>
          
          <h3>Void Acoustics Equipment</h3>
          <table class="equipment-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price (JOD)</th>
                <th>Total (JOD)</th>
              </tr>
            </thead>
            <tbody>
              ${calculationResults.equipmentDetails.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.finalUnitPriceJOD?.toFixed(2) || 'N/A'}</td>
                  <td>${item.finalTotalJOD?.toFixed(2) || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${calculationResults.customEquipmentDetails && calculationResults.customEquipmentDetails.length > 0 ? `
            <h3 style="margin-top: 30px;">Custom Equipment</h3>
            <table class="equipment-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price (JOD)</th>
                  <th>Total (JOD)</th>
                </tr>
              </thead>
              <tbody>
                ${calculationResults.customEquipmentDetails.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.finalUnitPriceJOD?.toFixed(2) || 'N/A'}</td>
                    <td>${item.finalTotalJOD?.toFixed(2) || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <p style="font-size: 10px; color: #666; margin-top: 5px; font-style: italic;">
              Note: Custom equipment is not subject to discount
            </p>
          ` : ''}
          
          ${calculationResults.servicesTotal > 0 ? `
            <h3 style="margin-top: 30px;">Professional Services</h3>
            <table class="equipment-table">
              <thead>
                <tr>
                  <th>Service Description</th>
                  <th>Price (JOD)</th>
                </tr>
              </thead>
              <tbody>
                ${project.services.commissioning ? `
                  <tr>
                    <td>Sub-contracting Commissioning</td>
                    <td>${(calculationResults.equipmentDealerTotalJOD * 0.06).toFixed(2)}</td>
                  </tr>
                ` : ''}
                ${project.services.noiseControl ? `
                  <tr>
                    <td>Noise Control Studies</td>
                    <td>${(calculationResults.equipmentDealerTotalJOD * 0.10).toFixed(2)}</td>
                  </tr>
                ` : ''}
                ${project.services.soundDesign ? `
                  <tr>
                    <td>Sound System Design</td>
                    <td>${(calculationResults.equipmentDealerTotalJOD * 0.025).toFixed(2)}</td>
                  </tr>
                ` : ''}
                ${project.services.projectManagement ? `
                  <tr>
                    <td>Project Management</td>
                    <td>${(calculationResults.equipmentDealerTotalJOD * 0.10).toFixed(2)}</td>
                  </tr>
                ` : ''}
                ${project.customServices.map(service => `
                  <tr>
                    <td>${service.name}</td>
                    <td>${service.price.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          <div class="totals">
            ${project.globalDiscount > 0 ? `
              <div class="totals-row">
                <span>Equipment Subtotal (before discount):</span>
                <span>${(calculationResults.equipmentTotalJODBeforeDiscount || 0).toFixed(2)} JOD</span>
              </div>
              <div class="totals-row discount">
                <span>Equipment Discount (${project.globalDiscount.toFixed(2)}%):</span>
                <span>-${(((calculationResults.equipmentTotalJODBeforeDiscount || 0) * project.globalDiscount) / 100).toFixed(2)} JOD</span>
              </div>
              <div class="totals-row">
                <span>Equipment Subtotal (after discount):</span>
                <span>${((calculationResults.equipmentTotalJODBeforeDiscount || 0) - (((calculationResults.equipmentTotalJODBeforeDiscount || 0) * project.globalDiscount) / 100)).toFixed(2)} JOD</span>
              </div>
            ` : `
              <div class="totals-row">
                <span>Equipment Subtotal:</span>
                <span>${(calculationResults.equipmentTotalJODBeforeDiscount || 0).toFixed(2)} JOD</span>
              </div>
            `}
            ${calculationResults.customEquipmentDetails && calculationResults.customEquipmentDetails.length > 0 ? `
              <div class="totals-row">
                <span>Custom Equipment Subtotal:</span>
                <span>${(calculationResults.customEquipmentTotalJOD || 0).toFixed(2)} JOD</span>
              </div>
            ` : ''}
            ${calculationResults.servicesTotal > 0 ? `
              <div class="totals-row">
                <span>Services Subtotal:</span>
                <span>${(calculationResults.servicesTotal || 0).toFixed(2)} JOD</span>
              </div>
            ` : ''}
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${(calculationResults.projectSubtotalJOD || 0).toFixed(2)} JOD</span>
            </div>
            <div class="totals-row">
              <span>VAT (16%):</span>
              <span>${(calculationResults.projectTaxJOD || 0).toFixed(2)} JOD</span>
            </div>
            <div class="totals-row total-final">
              <span>TOTAL:</span>
              <span>${(calculationResults.projectTotalJOD || 0).toFixed(2)} JOD</span>
            </div>
          </div>
          
          <div style="margin-top: 25px; font-size: 10px; color: #666;">
            <p><strong>Terms & Conditions:</strong></p>
            <ul>
              <li>All prices are in Jordanian Dinars (JOD)</li>
              <li>Equipment prices include door-to-door delivery</li>
              <li>VAT is calculated at 16% as per Jordanian tax regulations</li>
              <li>Subject to ±10% change after technical study</li>
              <li>Payment terms: 90% down payment, 10% after project completion</li>
              <li>This quotation is valid for 30 days from the date of issue</li>
            </ul>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('about:blank', '_blank');
    if (printWindow) {
      try {
        printWindow.document.open();
        // @ts-ignore - Using document.write for printing functionality
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Set window title to hide about:blank
        printWindow.document.title = `Quotation - ${project.projectName || 'Project'}`;
        
        // Wait for content to load then print
        setTimeout(() => {
          printWindow.print();
        }, 100);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please check if popup blocker is disabled.');
      }
    } else {
      alert('Unable to open print window. Please check if popup blocker is disabled.');
    }
  };

  // Download Purchase Order PDF
  const downloadPurchaseOrderPDF = (calculationResults, _project) => {
    const poNumber = (() => {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `20${year}${month}${day}1`;
    })();

    const deliveryDate = (() => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 42);
      return deliveryDate.toLocaleDateString('en-GB');
    })();

    // Filter to only include 'void' category equipment
    const voidEquipmentDetails = calculationResults.equipmentDetails.filter(item => {
      const equipment = equipmentDatabase.find(eq => eq.name === item.name);
      return equipment && equipment.category === 'void';
    });

    // Calculate void equipment totals
    const voidEquipmentTotal = voidEquipmentDetails.reduce((sum, item) => 
      sum + ((item.dealerPriceUSD || item.dealerUSD || 0) * (item.quantity || 0)), 0
    );

    const printContent = `
      <html>
        <head>
          <title>Purchase Order - ${poNumber}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
              body { margin: 0; }
            }
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { display: flex; justify-content: space-between}
            .company-info { padding-right: 20px; }
            .po-info { flex: 1; text-align: right; }
            .po-banner { background-color:rgb(108, 108, 108); color: Black; padding: 10px; text-align: Right; font-weight: bold; margin-bottom: 10px; font-size: 14px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; margin-bottom: 8px; }
            .two-column { display: flex; gap: 20px; margin-bottom: 15px; }
            .column { flex: 1; }
            .delivery-info { background-color: #f9fafb; padding: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
            .equipment-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
            .equipment-table th, .equipment-table td { border: 1px solid #d1d5db; padding: 6px; }
            .equipment-table th { background-color: #f3f4f6; }
            .totals { text-align: right; margin-bottom: 15px; }
            .total-banner { background-color:rgb(108, 108, 108); color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 15px; }
            .instructions { margin-bottom: 15px; font-size: 11px; }
            .signature-section { border-top: 1px solid #000; padding-top: 15px; margin-top: 20px; }
            .signature-row { display: flex; gap: 30px; margin-bottom: 30px; }
            .signature-field { flex: 1; }
            .signature-line { border-bottom: 1px solid #000; height: 20px; margin-top: 5px; }
            .footer { text-align: center; border-top: 1px solid #000; padding-top: 10px; margin-top: 20px; font-size: 11px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h2 style="margin: 0 0 0 0;">Deep Sound For Technical Consultation LLC</h2>
            </div>
            <div class="po-info">
              <div class="po-banner">PURCHASE ORDER</div>
              <div style="font-size: 11px;">
                <strong>Document Number:</strong> ${poNumber}<br/>
                <strong>Document Date:</strong> ${new Date().toLocaleDateString('en-GB')}<br/>
                <strong>Page:</strong> 1/1<br/><br/>
                <strong>Customer No.:</strong> _____________
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Bill To:</div>
            <div style="font-size: 11px;">
              <strong>Deep Sound For Technical Consultation LLC</strong><br/>
              Trading Name: Nogahub<br/>
              Housing Bank Complex 93 - Ground Floor 102<br/>
              Q. Nour St. - Welbdeh - Amman - Jordan
            </div>
          </div>

          <div class="section">
            <div class="section-title">Ship To:</div>
            <div style="font-size: 11px;">
              <strong>Third-Party Logistics Company:</strong> Moab Mountains for import and export (شركة جبال مؤاب للاستيراد والتصدير)<br/>
              <strong>Contact Person:</strong> Tarik Zuraikat<br/>
              <strong>Address:</strong> 260 Aqr St., Amman, Jordan<br/>
              <strong>City, Country:</strong> Amman, Jordan<br/>
              <strong>Phone:</strong> +96779061007<br/>
              <strong>Email:</strong> T.zuraikat@moab-llift.com
            </div>
          </div>

          <div class="section">
            <div class="section-title">Vendor Contact:</div>
            <div style="font-size: 11px;">
              Void Acoustics Research Ltd.<br/>
              Unit 15, Dawkins Road Industrial Estate<br/>
              Poole, Dorset, BH15 4JY<br/>
              United Kingdom
            </div>
          </div>

          <div class="delivery-info">
            <div><strong>Delivery Date:</strong> ${deliveryDate}</div>
            <div><strong>Currency:</strong> USD</div>
          </div>

          <table class="equipment-table">
            <thead>
              <tr>
                <th style="width: 8%;">#</th>
                <th>Description</th>
                <th style="width: 8%;">Qty</th>
                <th style="width: 15%;">Unit Price</th>
                <th style="width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${voidEquipmentDetails.map((item, index) => `
                <tr>
                  <td style="text-align: center;">${String(index + 1).padStart(3, '0')}</td>
                  <td>
                    <strong>${item.name}</strong><br/>
                    <span style="font-size: 9px; color: #6b7280;">Fiberglass enclosure, ${item.power || 'N/A'}, Professional Audio Equipment</span><br/>
                    <span style="font-size: 9px; color: #9ca3af;">Delivery Date: ${deliveryDate}</span>
                  </td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">$${(item.dealerPriceUSD || item.dealerUSD)?.toFixed(2) || '0.00'}</td>
                  <td style="text-align: right;">$${(((item.dealerPriceUSD || item.dealerUSD) || 0) * (item.quantity || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div><strong>Total Amount:</strong> $${voidEquipmentTotal.toFixed(2)}</div>
          </div>

          <div style="font-size: 11px; margin-bottom: 15px;">
            Professional audio equipment purchase for manufacturing facility.<br/>
            Based on Purchase Request ${poNumber}.
          </div>

          <div class="instructions">
            <div class="section-title">Special Instructions:</div>
            • Invoice to: Deep Sound For Technical Consultation LLC (Bill To address above)<br/>
            • Ship to: Third-party logistics company (Ship To address above)<br/>
            • Please include third-party shipping company details on all shipping documentation<br/>
            • Coordinate delivery schedule with shipping company contact person<br/>
            • All equipment must be factory sealed and include manufacturer warranties<br/>
            • Delivery confirmation required upon receipt at shipping company
          </div>

          <div class="instructions">
            <div class="section-title">Terms and Conditions:</div>
            • Payment: Net 30 days from invoice date<br/>
            • All prices are in USD and FOB origin<br/>
            • Vendor responsible for proper packaging and documentation<br/>
            • Any changes to this order must be approved in writing<br/>
            • Risk of loss transfers upon delivery to shipping company
          </div>

          <div class="signature-section">
            <div class="section-title">Confirmation of Purchase Order</div>
            <div class="signature-row">
              <div class="signature-field">
                <div><strong>Name</strong></div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-field">
                <div><strong>Signature</strong></div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-field">
                <div><strong>Date</strong></div>
                <div class="signature-line"></div>
              </div>
            </div>
          </div>

          <div class="footer">
            <strong>Deep Sound For Technical Consultation LLC</strong><br/>
            Phone: +962 (0) 795 4468 | Email: purchasing@nogahub.jo<br/>
            Website: www.nogahub.com
          </div>
        </body>
      </html>
    `;

    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.documentElement.innerHTML = printContent;
        
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 100);
      } else {
        alert('Unable to open print window. Please check if popup blocker is disabled.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check if popup blocker is disabled.');
    }
  };

  // Add equipment item
  const addEquipment = () => {
    setProject(prev => ({
      ...prev,
      equipment: [...prev.equipment, { code: '', quantity: 1 }]
    }));
    setIsCalculated(false);
  };

  // Update equipment item
  const updateEquipment = (index, field, value) => {
    setProject(prev => ({
      ...prev,
      equipment: prev.equipment.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
    setIsCalculated(false);
  };

  // Remove equipment item
  const removeEquipment = (index) => {
    setProject(prev => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index)
    }));
    setIsCalculated(false);
  };

  // Add custom service
  const addCustomService = () => {
    setProject(prev => ({
      ...prev,
      customServices: [...prev.customServices, { name: '', price: 0 }]
    }));
    setIsCalculated(false);
  };

  // Add custom equipment
  const addCustomEquipment = () => {
    setProject(prev => ({
      ...prev,
      customEquipment: [...prev.customEquipment, { name: '', price: 0, weight: 0 }]
    }));
    setIsCalculated(false);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <NogaHubLogo size={120} className="justify-center mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Automation</h1>
            <p className="text-gray-600">Deep Sound Technical Consultations</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={loginData.username}
                onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="Enter password"
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors duration-200 font-medium"
            >
              <LogIn size={20} />
              <span>Login</span>
            </button>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <NogaHubLogo size={80} />
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">Project Automation</h1>
                <p className="text-gray-600 mt-1">
                  Welcome, {userRole === 'admin' ? 'Administrator' : 'User'} | Deep Sound Technical Consultations
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Company Activities Section */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="px-6 py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Company Activities</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Installation Section */}
              <div 
                onClick={() => setActiveSection('installation')}
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  activeSection === 'installation' 
                    ? 'border-black bg-white shadow-lg' 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-center mb-3">
                  <Calculator size={24} className="mr-3 text-black" />
                  <h3 className="text-lg font-semibold text-gray-900">Installation</h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Sound system design, equipment procurement, installation, and commissioning services.
                </p>
                {activeSection === 'installation' && (
                  <div className="mt-3 px-3 py-1 bg-black text-white text-xs rounded-full inline-block">
                    Active
                  </div>
                )}
              </div>

              {/* Rental Section */}
              <div 
                onClick={() => setActiveSection('rental')}
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  activeSection === 'rental' 
                    ? 'border-black bg-white shadow-lg' 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-center mb-3">
                  <Zap size={24} className="mr-3 text-black" />
                  <h3 className="text-lg font-semibold text-gray-900">Rental</h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Equipment rental services for events, temporary installations, and short-term projects.
                </p>
                {activeSection === 'rental' && (
                  <div className="mt-3 px-3 py-1 bg-black text-white text-xs rounded-full inline-block">
                    Active
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Only show when Installation is active */}
        {activeSection === 'installation' && (
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'quotation', label: 'Quotation Builder', icon: Calculator, roles: ['admin', 'user'] },
                { id: 'saved-projects', label: 'Saved Projects', icon: FolderOpen, roles: ['admin', 'user'] },
                { id: 'roles', label: 'Role Assignment', icon: Users, roles: ['admin', 'user'] },
                { id: 'results', label: 'Financial Analysis', icon: TrendingUp, roles: ['admin'] },
                { id: 'documents', label: 'Documentation', icon: FileText, roles: ['admin', 'user'] },
                { id: 'entities', label: 'Business Entities', icon: Building2, roles: ['admin'] }
              ].filter(tab => tab.roles.includes(userRole)).map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all ${
                      activeTab === tab.id
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        <div className="p-6">
          {/* Installation Section Content */}
          {activeSection === 'installation' && (
            <>
              {/* Quotation Builder Tab */}
              {activeTab === 'quotation' && (
                <div className="space-y-6">
                  {/* Project Info */}
                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                      <input
                        type="text"
                        value={project.clientName}
                        onChange={(e) => setProject(prev => ({ ...prev, clientName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="Enter client name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                      <input
                        type="text"
                        value={project.projectName}
                        onChange={(e) => setProject(prev => ({ ...prev, projectName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="Enter project name"
                      />
                    </div>
                  </div>
              {/* Equipment Selection */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Void Acoustics Equipment Selection</h3>
                  {equipmentLoading && (
                    <div className="text-sm text-gray-500">Loading equipment...</div>
                  )}
                  {!equipmentLoading && equipmentDatabase.length === 0 && (
                    <div className="text-sm text-red-500">Equipment database not loaded</div>
                  )}
                  <div className="flex space-x-3">
                    <button
                      onClick={addEquipment}
                      className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Plus size={16} />
                      <span>Add Equipment</span>
                    </button>
                    <button
                      onClick={handleCalculate}
                      className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <RefreshCw size={16} />
                      <span>Calculate</span>
                    </button>
                    <button
                      onClick={() => setShowSaveModal(true)}
                      disabled={project.equipment.length === 0 && project.customEquipment.length === 0}
                      className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      <span>Save Project</span>
                    </button>
                  </div>
                </div>
                
                {/* Global Discount */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Global Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={project.globalDiscount}
                    onChange={(e) => {
                      setProject(prev => ({ ...prev, globalDiscount: parseFloat(e.target.value) || 0 }));
                      setIsCalculated(false);
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-3">
                  {project.equipment.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <select
                        value={item.code}
                        onChange={(e) => updateEquipment(index, 'code', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black bg-white"
                      >
                        <option value="">
                          {equipmentLoading ? 'Loading equipment...' : 'Select equipment'}
                        </option>
                        {!equipmentLoading && (
                          <>
                            <optgroup label="Void Acoustics Equipment">
                              {equipmentDatabase.filter(eq => eq.category === 'void').map(eq => (
                                <option key={eq.code} value={eq.code}>
                                  {eq.name} - ${eq.clientUSD || eq.price} USD ({eq.weight}kg)
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Accessories">
                              {equipmentDatabase.filter(eq => eq.category === 'accessory').map(eq => (
                                <option key={eq.code} value={eq.code}>
                                  {eq.name} - ${eq.clientUSD || eq.price} USD ({eq.weight}kg)
                                </option>
                              ))}
                            </optgroup>
                          </>
                        )}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateEquipment(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="Qty"
                      />
                      <button
                        onClick={() => removeEquipment(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Services</h3>
                
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={project.services.commissioning}
                      onChange={(e) => {
                        setProject(prev => ({
                          ...prev,
                          services: { ...prev.services, commissioning: e.target.checked }
                        }));
                        setIsCalculated(false);
                      }}
                      className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <span>Commissioning</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={project.services.noiseControl}
                      onChange={(e) => {
                        setProject(prev => ({
                          ...prev,
                          services: { ...prev.services, noiseControl: e.target.checked }
                        }));
                        setIsCalculated(false);
                      }}
                      className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <span>Noise Control Studies</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={project.services.soundDesign}
                      onChange={(e) => {
                        setProject(prev => ({
                          ...prev,
                          services: { ...prev.services, soundDesign: e.target.checked }
                        }));
                        setIsCalculated(false);
                      }}
                      className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <span>Sound System Design</span>
                  </label>
                </div>

                {/* Custom Equipment */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Custom Equipment</h4>
                    <button
                      onClick={addCustomEquipment}
                      className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Add Custom Equipment
                    </button>
                  </div>
                  
                  {project.customEquipment.map((equipment, index) => (
                    <div key={index} className="flex items-center space-x-3 mb-2">
                      <input
                        type="text"
                        placeholder="Equipment name"
                        value={equipment.name}
                        onChange={(e) => {
                          setProject(prev => ({
                            ...prev,
                            customEquipment: prev.customEquipment.map((eq, i) => 
                              i === index ? { ...eq, name: e.target.value } : eq
                            )
                          }));
                          setIsCalculated(false);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                      />
                      <input
                        type="text"
                        placeholder="Price"
                        value={equipment.price}
                        onChange={(e) => {
                          setProject(prev => ({
                            ...prev,
                            customEquipment: prev.customEquipment.map((eq, i) => 
                              i === index ? { ...eq, price: parseFloat(e.target.value) || 0 } : eq
                            )
                          }));
                          setIsCalculated(false);
                        }}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={equipment.weight}
                        onChange={(e) => {
                          setProject(prev => ({
                            ...prev,
                            customEquipment: prev.customEquipment.map((eq, i) => 
                              i === index ? { ...eq, weight: parseFloat(e.target.value) || 0 } : eq
                            )
                          }));
                          setIsCalculated(false);
                        }}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                      />
                      <button
                        onClick={() => {
                          setProject(prev => ({
                            ...prev,
                            customEquipment: prev.customEquipment.filter((_, i) => i !== index)
                          }));
                          setIsCalculated(false);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Custom Services */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Custom Services</h4>
                    <button
                      onClick={addCustomService}
                      className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Add Service
                    </button>
                  </div>
                  
                  {project.customServices.map((service, index) => (
                    <div key={index} className="flex items-center space-x-3 mb-2">
                      <input
                        type="text"
                        placeholder="Service name"
                        value={service.name}
                        onChange={(e) => {
                          setProject(prev => ({
                            ...prev,
                            customServices: prev.customServices.map((s, i) => 
                              i === index ? { ...s, name: e.target.value } : s
                            )
                          }));
                          setIsCalculated(false);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                      />
                      <input
                        type="number"
                        placeholder="Price (JOD)"
                        value={service.price}
                        onChange={(e) => {
                          setProject(prev => ({
                            ...prev,
                            customServices: prev.customServices.map((s, i) => 
                              i === index ? { ...s, price: parseInt(e.target.value) || 0 } : s
                            )
                          }));
                          setIsCalculated(false);
                        }}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                      />
                      <button
                        onClick={() => {
                          setProject(prev => ({
                            ...prev,
                            customServices: prev.customServices.filter((_, i) => i !== index)
                          }));
                          setIsCalculated(false);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* BOQ Display */}
              {isCalculated && calculationResults && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill of Quantities (BOQ)</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-black text-white">
                          <th className="text-left p-3 font-medium">Item Code</th>
                          <th className="text-left p-3 font-medium">Description</th>
                          <th className="text-center p-3 font-medium">Qty</th>
                          <th className="text-right p-3 font-medium">Unit Price (JOD)</th>
                          <th className="text-right p-3 font-medium">Total (JOD)</th>
                          <th className="text-right p-3 font-medium">Weight (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculationResults.equipmentDetails.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3 font-mono">{equipmentDatabase.find(eq => eq.name === item.name)?.code || 'N/A'}</td>
                            <td className="p-3">{item.name}</td>
                            <td className="p-3 text-center">{item.quantity}</td>
                            <td className="p-3 text-right">{item.finalUnitPriceJOD?.toFixed(2) || 'N/A'}</td>
                            <td className="p-3 text-right font-semibold">{item.finalTotalJOD?.toFixed(2) || 'N/A'}</td>
                            <td className="p-3 text-right">{item.weightTotal.toFixed(1)}</td>
                          </tr>
                        ))}
                        {calculationResults.customEquipmentDetails && calculationResults.customEquipmentDetails.map((item, index) => (
                          <tr key={`custom-${index}`} className="border-b border-gray-200 hover:bg-gray-50 bg-blue-50">
                            <td className="p-3 font-mono">{item.code}</td>
                            <td className="p-3">{item.name}</td>
                            <td className="p-3 text-center">{item.quantity}</td>
                            <td className="p-3 text-right">{item.finalUnitPriceJOD?.toFixed(2) || 'N/A'}</td>
                            <td className="p-3 text-right font-semibold">{item.finalTotalJOD?.toFixed(2) || 'N/A'}</td>
                            <td className="p-3 text-right">{item.weightTotal.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan="4" className="p-3 text-right">Equipment Subtotal:</td>
                          <td className="p-3 text-right">{(calculationResults.equipmentTotalJODBeforeDiscount || 0).toFixed(2)} JOD</td>
                          <td className="p-3 text-right">{calculationResults.totalWeight.toFixed(1)} kg</td>
                        </tr>
                        {calculationResults.customEquipmentDetails && calculationResults.customEquipmentDetails.length > 0 && (
                          <tr className="bg-blue-100 font-semibold">
                            <td colSpan="4" className="p-3 text-right">Custom Equipment Subtotal:</td>
                            <td className="p-3 text-right">{(calculationResults.customEquipmentTotalJOD || 0).toFixed(2)} JOD</td>
                            <td className="p-3 text-right">0.0 kg</td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Calculation Summary */}
              {isCalculated && calculationResults && (
                <div className="bg-gray-50 p-4 rounded-xl border">
                  <h4 className="font-semibold text-gray-900 mb-2">Project Summary</h4>
                  <div className={`grid ${project.globalDiscount > 0 ? 'grid-cols-5' : 'grid-cols-4'} gap-4 text-sm`}>
                    <div>
                      <span className="text-gray-600">Equipment Total:</span>
                      <p className="font-semibold">{(calculationResults.equipmentTotalJOD || 0).toFixed(2)} JOD</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Services Total:</span>
                      <p className="font-semibold">{(calculationResults.servicesTotal || 0).toFixed(2)} JOD</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Subtotal:</span>
                      <p className="font-semibold">{(calculationResults.projectSubtotalJOD || 0).toFixed(2)} JOD</p>
                    </div>
                    {project.globalDiscount > 0 && (
                      <div>
                        <span className="text-gray-600">Discount:</span>
                        <p className="font-semibold text-red-600">-{project.globalDiscount.toFixed(2)}%</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Final (with 16% VAT):</span>
                      <p className="font-semibold text-green-600">{(calculationResults.projectTotalJOD || 0).toFixed(2)} JOD</p>
                    </div>
                  </div>
                </div>
              )}

              {!isCalculated && project.equipment.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800">
                    <strong>Please click "Calculate" to generate accurate door-to-door pricing and BOQ.</strong>
                    <br />
                    Equipment prices include shipping, customs, and all door-to-door costs based on business model.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Saved Projects Tab */}
          {activeTab === 'saved-projects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Saved Projects ({savedProjects.length})</h3>
              </div>

              {savedProjects.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                  <FolderOpen size={48} className="mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No saved projects yet</h4>
                  <p className="text-gray-600">Create a project with equipment and click "Save Project" to get started.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {savedProjects.map((savedProject) => (
                    <div
                      key={savedProject.id}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => loadSavedProject(savedProject)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{savedProject.projectName}</h4>
                            {savedProject.hasCalculation && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Calculated
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 font-medium mb-1">{savedProject.clientName}</p>
                          {userRole === 'admin' && savedProject.User && (
                            <p className="text-blue-600 text-sm mb-1">Created by: {savedProject.User.username} ({savedProject.User.email})</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <span>{(savedProject.equipment?.length || 0) + (savedProject.customEquipment?.length || 0)} items</span>
                            <span>•</span>
                            <span>{(savedProject.total || 0).toFixed(2)} JOD total</span>
                            <span>•</span>
                            <span>Saved {savedProject.createdAt || new Date(savedProject.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          {/* Show selected equipment preview */}
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-2">Equipment:</p>
                            <div className="flex flex-wrap gap-1">
                              {(savedProject.equipment || []).slice(0, 3).map((item, index) => {
                                const equipment = equipmentDatabase.find(eq => eq.code === item.code);
                                return equipment ? (
                                  <span key={index} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                    {equipment.name} ({item.quantity})
                                  </span>
                                ) : null;
                              })}
                              {(savedProject.equipment?.length || 0) > 3 && (
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  +{(savedProject.equipment?.length || 0) - 3} more
                                </span>
                              )}
                              {(savedProject.customEquipment || []).map((item, index) => (
                                <span key={`custom-${index}`} className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {item.name} (Custom)
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this saved project?')) {
                              deleteSavedProject(savedProject.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Role Assignment Tab */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Project Role Assignment</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producer (Lead Generator)</label>
                  <select
                    value={project.roles.producer}
                    onChange={(e) => setProject(prev => ({
                      ...prev,
                      roles: { ...prev.roles, producer: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="">Select producer</option>
                    <option value="Nadeem">Nadeem Mazahreh</option>
                    <option value="Issa">Issa Sweiss</option>
                    <option value="Kareem">Kareem Qosous</option>
                    <option value="Omar">Omar</option>
                    <option value="Ammar">Ammar Heis</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Compensation: {calculationResults ? calculationResults.producerFee.toFixed(2) : '0.00'} JOD (5% of void sales profit)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager/Director</label>
                  <select
                    value={project.roles.projectManager}
                    onChange={(e) => setProject(prev => ({
                      ...prev,
                      roles: { ...prev.roles, projectManager: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="">Select project manager</option>
                    <option value="Nadeem">Nadeem Mazahreh</option>
                    <option value="Issa">Issa Sweiss</option>
                    <option value="Omar">Omar</option>
                    <option value="Ammar">Ammar Heis</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Compensation: {calculationResults ? calculationResults.pmFee.toFixed(2) : '0.00'} JOD (22.5% of void sales profit)
                  </p>
                </div>
              </div>

              {/* Role Responsibilities */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Role Responsibilities</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h5 className="font-semibold text-gray-800 mb-3">
                      Producer - {project.roles.producer || 'Not Assigned'}
                    </h5>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Initial client contact and lead qualification</li>
                      <li>• Site visit and requirements gathering</li>
                      <li>• Client relationship management</li>
                      <li>• Contract negotiation support</li>
                      <li>• 5% compensation of void sales profit</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h5 className="font-semibold text-gray-800 mb-3">
                      Project Manager - {project.roles.projectManager || 'Not Assigned'}
                    </h5>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Project planning and timeline creation</li>
                      <li>• Technical design and specifications (EASE, SketchUp, AutoCAD)</li>
                      <li>• Equipment procurement coordination</li>
                      <li>• Installation supervision and commissioning</li>
                      <li>• Quality control and client training</li>
                      <li>• 22.5% compensation of void sales profit</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h5 className="font-semibold text-gray-800 mb-3">Finance - Ammar Heis</h5>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Invoice generation and processing</li>
                      <li>• Payment tracking and collection</li>
                      <li>• Financial reporting and compliance</li>
                      <li>• Multi-entity bookkeeping</li>
                      <li>• Budget monitoring and analysis</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h5 className="font-semibold text-gray-800 mb-3">Legal - Omar</h5>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Contract review and preparation</li>
                      <li>• Legal compliance verification</li>
                      <li>• Risk assessment and mitigation</li>
                      <li>• Documentation review</li>
                      <li>• Regulatory compliance (Jordan)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Analysis Tab - Admin Only */}
          {activeTab === 'results' && userRole === 'admin' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Financial Analysis & Profit Distribution</h3>
              
              {!isCalculated && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-orange-800">Please calculate the project first to see financial analysis.</p>
                </div>
              )}

              {isCalculated && calculationResults && (
                <>
                  {/* Entity Performance Overview */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-black text-white p-4 rounded-xl">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Building2 size={20} className="mr-2" />
                        Void Acoustics Jordan
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Equipment Revenue:</span>
                          <span>{calculationResults.equipmentTotalJOD.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Door-to-Door Cost:</span>
                          <span>{calculationResults.doorToDoorCostJOD.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-gray-600 pt-2">
                          <span>Sales Profit:</span>
                          <span className="text-green-400">{calculationResults.voidSalesProfit.toFixed(2)} JOD</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900 text-white p-4 rounded-xl">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Zap size={20} className="mr-2" />
                        Nogahub
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Services Revenue:</span>
                          <span>{calculationResults.servicesTotal.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Management Fee:</span>
                          <span>{calculationResults.nogahubFee.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-gray-600 pt-2">
                          <span>Total Revenue:</span>
                          <span className="text-green-400">{(calculationResults.servicesTotal + calculationResults.nogahubFee).toFixed(2)} JOD</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 text-white p-4 rounded-xl">
                      <h4 className="font-semibold mb-3">Project Totals</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{calculationResults.projectSubtotalJOD.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>VAT (16%):</span>
                          <span>{calculationResults.projectTaxJOD.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-gray-600 pt-2">
                          <span>Final Total:</span>
                          <span className="text-green-400">{calculationResults.projectTotalJOD.toFixed(2)} JOD</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role-Based Compensation */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Role-Based Compensation</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-gray-600">Producer Fee</p>
                        <p className="text-lg font-semibold text-yellow-700">{calculationResults.producerFee.toFixed(2)} JOD</p>
                        <p className="text-xs text-gray-500">{project.roles.producer || 'Not assigned'} (5% of void profit)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Project Manager Fee</p>
                        <p className="text-lg font-semibold text-yellow-700">{calculationResults.pmFee.toFixed(2)} JOD</p>
                        <p className="text-xs text-gray-500">{project.roles.projectManager || 'Not assigned'} (22.5% of void profit)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Nogahub Management Fee</p>
                        <p className="text-lg font-semibold text-yellow-700">{calculationResults.nogahubFee.toFixed(2)} JOD</p>
                        <p className="text-xs text-gray-500">Administrative (7.5% of void profit)</p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Profit Distribution */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Void Acoustics Jordan Distribution</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Retained Earnings (5%):</span>
                          <span>{calculationResults.breakdown.voidRetainedEarnings.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expenses (35%):</span>
                          <span>{calculationResults.breakdown.voidExpenses.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Shareholder Distribution (60%):</span>
                          <span>{calculationResults.breakdown.voidShareholderDistribution.toFixed(2)} JOD</span>
                        </div>
                        <div className="ml-4 space-y-1 text-xs text-gray-600 border-l-2 border-gray-300 pl-3">
                          <div className="flex justify-between">
                            <span>• Nadeem (50%):</span>
                            <span>{calculationResults.breakdown.nadeemVoidShare.toFixed(2)} JOD</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• Issa (22.5%):</span>
                            <span>{calculationResults.breakdown.issaVoidShare.toFixed(2)} JOD</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• Omar (22.5%):</span>
                            <span>{calculationResults.breakdown.bakriVoidShare.toFixed(2)} JOD</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Nogahub Distribution</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Admin Expenses (50%):</span>
                          <span>{calculationResults.breakdown.nogahubExpenses.toFixed(2)} JOD</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Profit Distribution (50%):</span>
                          <span>{calculationResults.breakdown.nogahubProfit.toFixed(2)} JOD</span>
                        </div>
                        <div className="ml-4 space-y-1 text-xs text-gray-600 border-l-2 border-gray-300 pl-3">
                          <div className="flex justify-between">
                            <span>• Nadeem (40%):</span>
                            <span>{calculationResults.breakdown.nadeemNogahubShare.toFixed(2)} JOD</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• Issa (40%):</span>
                            <span>{calculationResults.breakdown.issaNogahubShare.toFixed(2)} JOD</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• Wewealth (20%):</span>
                            <span>{calculationResults.breakdown.wewealthNogahubShare.toFixed(2)} JOD</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Individual Distribution */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Final Individual Distribution</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(calculationResults.distribution).map(([person, amount]) => (
                        <div key={person} className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-600 capitalize">{person}</p>
                          <p className="text-lg font-bold text-green-600">{amount.toFixed(2)} JOD</p>
                          <p className="text-xs text-gray-500">{((amount / calculationResults.projectSubtotalJOD) * 100).toFixed(1)}% of project</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Business Insights */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Business Performance Metrics</h4>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-gray-600">Gross Margin</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {((calculationResults.voidSalesProfit / calculationResults.equipmentTotalJOD) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Service Revenue %</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {((calculationResults.servicesTotal / calculationResults.projectSubtotalJOD) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Equipment Markup</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {(((calculationResults.equipmentClientTotalJOD - calculationResults.equipmentDealerTotalJOD) / calculationResults.equipmentDealerTotalJOD) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Total Profit Margin</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {(((calculationResults.projectSubtotalJOD - calculationResults.doorToDoorCostJOD) / calculationResults.projectSubtotalJOD) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Business Entities Tab - Admin Only */}
          {activeTab === 'entities' && userRole === 'admin' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Business Structure & Entities</h3>
              
              <div className="grid grid-cols-1 gap-6">
                {Object.entries(businessEntities).map(([key, entity]) => (
                  <div key={key} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                    <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Building2 size={24} className="mr-2" />
                      {entity.name}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Ownership Structure</h5>
                        <div className="space-y-2">
                          {Object.entries(entity.ownership).map(([owner, percentage]) => (
                            <div key={owner} className="flex justify-between items-center p-2 bg-white rounded border">
                              <span className="capitalize font-medium">{owner}:</span>
                              <span className="font-semibold">{(percentage * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Core Services</h5>
                        <ul className="space-y-1">
                          {entity.services.map((service, index) => (
                            <li key={index} className="text-sm text-gray-600 p-2 bg-white rounded border">
                              • {service}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Corporate Structure Overview */}
              <div className="bg-black text-white rounded-xl p-6">
                <h4 className="text-xl font-semibold mb-4">Corporate Umbrella</h4>
                <div className="text-sm space-y-2">
                  <p><strong>Deep Sound for Technical Consultations</strong></p>
                  <p>Housing Bank Complex 93 - Ground Floor 102</p>
                  <p>Q. Nour St. - Welbdeh - Amman - Jordan</p>
                  <p>Phone: +962 (0) 795144821</p>
                  <p className="mt-4 text-gray-300">Legal umbrella for all business operations in Jordan</p>
                </div>
              </div>

              {/* Key Personnel */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-4">Key Personnel</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Core Leadership</h5>
                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded border">
                        <p className="font-semibold">Nadeem Mazahreh</p>
                        <p className="text-sm text-gray-600">Co-founder, Strategic Partnerships, Business Development</p>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <p className="font-semibold">Issa Sweiss</p>
                        <p className="text-sm text-gray-600">Co-founder, Operations Manager, Technical Expertise</p>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <p className="font-semibold">Omar</p>
                        <p className="text-sm text-gray-600">Legal Advisor, Board Member, Contract Management</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Operational Team</h5>
                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded border">
                        <p className="font-semibold">Ammar Heis</p>
                        <p className="text-sm text-gray-600">Finance Manager - Accounting, Budgeting, Compliance</p>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <p className="font-semibold">Kareem Qosous</p>
                        <p className="text-sm text-gray-600">Sales Support, Operations Intern</p>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <p className="font-semibold">Dima Amer</p>
                        <p className="text-sm text-gray-600">Logistics Manager</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Project Documentation</h3>
              
              {!isCalculated && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-orange-800">Please calculate the project first to generate documents.</p>
                </div>
              )}

              {isCalculated && calculationResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Quotation */}
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Client Quotation</h4>
                    <div className="bg-white border rounded-lg p-4 text-sm space-y-2">
                      <div className="border-b pb-2 mb-3">
                        <h5 className="font-bold">Deep Sound For Technical Consultations</h5>
                        <p className="text-xs text-gray-600">Housing Bank Complex 93 - Ground Floor 102</p>
                        <p className="text-xs text-gray-600">Q. Nour St. - Welbdeh - Amman - Jordan</p>
                        <p className="text-xs text-gray-600">+962 (0) 795144821</p>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span>Client: {project.clientName || 'Client Name'}</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs">Project: {project.projectName || 'Project Name'}</div>
                      
                      <div className="mt-4">
                        <h6 className="font-semibold mb-2">Void Acoustics Equipment:</h6>
                        {calculationResults.equipmentDetails.map((item, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span>{item.name} x{item.quantity}</span>
                            <span>{item.finalTotalJOD?.toFixed(2) || 'N/A'} JOD</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-medium mt-2 pt-2 border-t">
                          <span>Equipment Subtotal:</span>
                          <span>{(calculationResults.equipmentTotalJODBeforeDiscount || 0).toFixed(2)} JOD</span>
                        </div>
                        {project.globalDiscount > 0 && (
                          <div className="flex justify-between text-xs text-red-600">
                            <span>Equipment Discount ({project.globalDiscount.toFixed(2)}%):</span>
                            <span>-{(((calculationResults.equipmentTotalJODBeforeDiscount || 0) * project.globalDiscount) / 100).toFixed(2)} JOD</span>
                          </div>
                        )}
                        
                        {calculationResults.customEquipmentDetails && calculationResults.customEquipmentDetails.length > 0 && (
                          <>
                            <h6 className="font-semibold mt-3 mb-2">Custom Equipment:</h6>
                            {calculationResults.customEquipmentDetails.map((item, index) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span>{item.name} x{item.quantity}</span>
                                <span>{item.finalTotalJOD?.toFixed(2) || 'N/A'} JOD</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-medium mt-2 pt-2 border-t">
                              <span>Custom Equipment Subtotal:</span>
                              <span>{(calculationResults.customEquipmentTotalJOD || 0).toFixed(2)} JOD</span>
                            </div>
                          </>
                        )}
                        
                        {calculationResults.servicesTotal > 0 && (
                          <>
                            <h6 className="font-semibold mt-3 mb-2">Professional Services:</h6>
                            {project.services.commissioning && (
                              <div className="flex justify-between text-xs">
                                <span>Sub-contracting Commissioning</span>
                                <span>{(calculationResults.equipmentDealerTotalJOD * servicePricing.commissioning).toFixed(2)} JOD</span>
                              </div>
                            )}
                            {project.services.noiseControl && (
                              <div className="flex justify-between text-xs">
                                <span>Noise Control Studies</span>
                                <span>{(calculationResults.equipmentDealerTotalJOD * servicePricing.noiseControl).toFixed(2)} JOD</span>
                              </div>
                            )}
                            {project.services.soundDesign && (
                              <div className="flex justify-between text-xs">
                                <span>Sound System Design</span>
                                <span>{(calculationResults.equipmentDealerTotalJOD * servicePricing.soundDesign).toFixed(2)} JOD</span>
                              </div>
                            )}
                            {project.services.projectManagement && (
                              <div className="flex justify-between text-xs">
                                <span>Project Management</span>
                                <span>{(calculationResults.equipmentDealerTotalJOD * servicePricing.projectManagement).toFixed(2)} JOD</span>
                              </div>
                            )}
                            {project.customServices.map((service, index) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span>{service.name}</span>
                                <span>{service.price.toFixed(2)} JOD</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-medium mt-2 pt-2 border-t">
                              <span>Services Subtotal:</span>
                              <span>{(calculationResults.servicesTotal || 0).toFixed(2)} JOD</span>
                            </div>
                          </>
                        )}
                        
                        <div className="border-t mt-3 pt-2">
                          <div className="flex justify-between text-xs">
                            <span>Total:</span>
                            <span>{(calculationResults.projectSubtotalJOD || 0).toFixed(2)} JOD</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>VAT (16%):</span>
                            <span>{(calculationResults.projectTaxJOD || 0).toFixed(2)} JOD</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Total:</span>
                            <span>{(calculationResults.projectTotalJOD || 0).toFixed(2)} JOD</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => downloadQuotationPDF(calculationResults, project)}
                      className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Download size={16} />
                      <span>Download Quotation PDF</span>
                    </button>
                  </div>

                  {/* Internal Project Plan */}
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Internal Project Plan</h4>
                    <div className="bg-gray-50 border rounded-lg p-4 text-sm space-y-3">
                      <div>
                        <h6 className="font-semibold text-gray-800">Project Overview</h6>
                        <p className="text-xs text-gray-600 mt-1">
                          Project Value: {calculationResults.projectTotalJOD.toFixed(2)} JOD<br/>
                          Equipment Count: {project.equipment.reduce((sum, item) => sum + (item.quantity || 0), 0)} pieces<br/>
                          Total Weight: {calculationResults.totalWeight.toFixed(1)} kg<br/>
                          Door-to-Door Cost: {calculationResults.doorToDoorCostJOD.toFixed(2)} JOD<br/>
                          Void Sales Profit: {calculationResults.voidSalesProfit.toFixed(2)} JOD
                        </p>
                      </div>

                      <div>
                        <h6 className="font-semibold text-gray-800">Team Assignment</h6>
                        <div className="text-xs text-gray-600 space-y-1 mt-1">
                          <p>Producer: {project.roles.producer || 'Not assigned'}</p>
                          <p>Project Manager: {project.roles.projectManager || 'Not assigned'}</p>
                          <p>Finance: Ammar Heis</p>
                          <p>Legal: Omar</p>
                          <p>Logistics: Dima Amer</p>
                        </div>
                      </div>

                      {userRole === 'admin' && (
                        <div>
                          <h6 className="font-semibold text-gray-800">Profit Distribution</h6>
                          <div className="text-xs text-gray-600 space-y-1 mt-1">
                            {Object.entries(calculationResults.distribution).map(([person, amount]) => (
                              <p key={person} className="flex justify-between">
                                <span className="capitalize">{person}:</span>
                                <span>{amount.toFixed(2)} JOD</span>
                              </p>
                            ))}
                            <div className="border-t pt-1 mt-1">
                              <p className="flex justify-between font-semibold">
                                <span>Total Distributed:</span>
                                <span>{Object.values(calculationResults.distribution).reduce((a, b) => a + b, 0).toFixed(2)} JOD</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <h6 className="font-semibold text-gray-800">Key Milestones</h6>
                        <div className="text-xs text-gray-600 space-y-1 mt-1">
                          <p>• Contract Signing & Payment Terms</p>
                          <p>• Equipment Procurement from Void UK</p>
                          <p>• Shipping & Customs Clearance</p>
                          <p>• Site Preparation & Technical Design</p>
                          <p>• Installation & Commissioning</p>
                          <p>• Testing, Training & Handover</p>
                        </div>
                      </div>
                    </div>
                    
                    <button className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                      <Download size={16} />
                      <span>Export Project Plan</span>
                    </button>
                  </div>

                  {/* Void UK Purchase Order - Admin Only */}
                  {userRole === 'admin' && (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Void UK Purchase Order</h4>
                    <div className="bg-white border rounded-lg p-6 text-sm">
                      {/* Header Section */}
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <h5 className="text-lg font-bold mb-1">Deep Sound For Technical Consultation LLC</h5>
                        </div>
                        <div className="text-right">
                          <div className="bg-gray-700 text-white px-3 py-2 text-center font-bold mb-4 text-sm">
                            PURCHASE ORDER
                          </div>
                          <div className="text-xs space-y-1">
                            <p><strong>Document Number:</strong> {(() => {
                              const now = new Date();
                              const year = now.getFullYear().toString().slice(-2);
                              const month = String(now.getMonth() + 1).padStart(2, '0');
                              const day = String(now.getDate()).padStart(2, '0');
                              return `20${year}${month}${day}1`;
                            })()}</p>
                            <p><strong>Document Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                            <p><strong>Page:</strong> 1/1</p>
                            <div className="mt-3">
                              <p><strong>Customer No.:</strong> _____________</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bill To Section */}
                      <div className="mb-4">
                        <p className="font-semibold mb-2">Bill To:</p>
                        <div className="text-xs space-y-1">
                          <p className="font-medium">Deep Sound For Technical Consultation LLC</p>
                          <p>Trading Name: Nogahub</p>
                          <p>Housing Bank Complex 93 - Ground Floor 102</p>
                          <p>Q. Nour St. - Welbdeh - Amman - Jordan</p>
                        </div>
                      </div>

                      {/* Ship To Section */}
                      <div className="mb-4">
                        <p className="font-semibold mb-2">Ship To:</p>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p><strong>Third-Party Logistics Company:</strong> Moab Mountains for import and export (شركة جبال مؤاب للاستيراد والتصدير)</p>
                            <p><strong>Contact Person:</strong> Tarik Zuraikat</p>
                            <p><strong>Address:</strong> 260 Aqr St., Amman, Jordan</p>
                            <p><strong>City, Country:</strong> Amman, Jordan</p>
                            <p><strong>Phone:</strong> +96779061007</p>
                            <p><strong>Email:</strong> T.zuraikat@moab-llift.com</p>
                          </div>
                        </div>
                      </div>

                      {/* Vendor Contact */}
                      <div className="mb-6">
                        <p className="font-semibold mb-2">Vendor Contact:</p>
                        <div className="text-xs space-y-1">
                          <p>Void Acoustics Research Ltd.</p>
                          <p>Unit 15, Dawkins Road Industrial Estate</p>
                          <p>Poole, Dorset, BH15 4JY</p>
                          <p>United Kingdom</p>
                        </div>
                      </div>

                      {/* Delivery Info */}
                      <div className="grid grid-cols-2 gap-6 mb-6 bg-gray-50 p-3">
                        <div>
                          <p className="font-semibold text-sm">Delivery Date: {(() => {
                            const deliveryDate = new Date();
                            deliveryDate.setDate(deliveryDate.getDate() + 42); // 6 weeks from now
                            return deliveryDate.toLocaleDateString('en-GB');
                          })()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">Currency: USD</p>
                        </div>
                      </div>

                      {/* Equipment Table */}
                      <div className="mb-6">
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 p-2 text-left w-12">#</th>
                              <th className="border border-gray-300 p-2 text-left">Description</th>
                              <th className="border border-gray-300 p-2 text-center w-16">Qty</th>
                              <th className="border border-gray-300 p-2 text-right w-24">Unit Price</th>
                              <th className="border border-gray-300 p-2 text-right w-24">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calculationResults.equipmentDetails
                              .filter(item => {
                                const equipment = equipmentDatabase.find(eq => eq.name === item.name);
                                return equipment && equipment.category === 'void';
                              })
                              .map((item, index) => (
                              <tr key={index}>
                                <td className="border border-gray-300 p-2 text-center">{String(index + 1).padStart(3, '0')}</td>
                                <td className="border border-gray-300 p-2">
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-gray-600 text-xs mt-1">
                                    Fiberglass enclosure, {item.power || 'N/A'}, {item.specs || 'Professional Audio Equipment'}
                                  </div>
                                  <div className="text-gray-500 text-xs">Delivery Date: {(() => {
                                    const deliveryDate = new Date();
                                    deliveryDate.setDate(deliveryDate.getDate() + 42);
                                    return deliveryDate.toLocaleDateString('en-GB');
                                  })()}</div>
                                </td>
                                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                                <td className="border border-gray-300 p-2 text-right">${(item.dealerPriceUSD || item.dealerUSD)?.toFixed(2) || '0.00'}</td>
                                <td className="border border-gray-300 p-2 text-right">${(((item.dealerPriceUSD || item.dealerUSD) || 0) * (item.quantity || 0)).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals Section */}
                      <div className="text-right mb-6">
                        <div className="inline-block text-sm space-y-2">
                          <div className="flex justify-between w-64">
                            <span>Total Amount:</span>
                            <span className="font-semibold">${(() => {
                              const voidEquipmentTotal = calculationResults.equipmentDetails
                                .filter(item => {
                                  const equipment = equipmentDatabase.find(eq => eq.name === item.name);
                                  return equipment && equipment.category === 'void';
                                })
                                .reduce((sum, item) => sum + ((item.dealerPriceUSD || item.dealerUSD || 0) * (item.quantity || 0)), 0);
                              return voidEquipmentTotal.toFixed(2);
                            })()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-6 text-xs">
                        <p className="mb-2">Professional audio equipment purchase for manufacturing facility.</p>
                        <p>Based on Purchase Request {(() => {
                          const now = new Date();
                          const year = now.getFullYear().toString().slice(-2);
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          return `20${year}${month}${day}1`;
                        })()}.</p>
                      </div>

                      {/* Special Instructions */}
                      <div className="mb-6">
                        <p className="font-semibold text-sm mb-2">Special Instructions:</p>
                        <div className="text-xs space-y-1 pl-4">
                          <p>• Invoice to: Deep Sound For Technical Consultation LLC (Bill To address above)</p>
                          <p>• Ship to: Third-party logistics company (Ship To address above)</p>
                          <p>• Please include third-party shipping company details on all shipping documentation</p>
                          <p>• Coordinate delivery schedule with shipping company contact person</p>
                        </div>
                      </div>

                      {/* Signature Section */}
                      <div className="border-t pt-4">
                        <p className="font-semibold text-sm mb-4">Confirmation of Purchase Order</p>
                        <div className="grid grid-cols-3 gap-6 text-xs">
                          <div>
                            <p className="font-medium mb-2">Name</p>
                            <div className="border-b border-gray-400 h-6 mb-2"></div>
                          </div>
                          <div>
                            <p className="font-medium mb-2">Signature</p>
                            <div className="border-b border-gray-400 h-6 mb-2"></div>
                          </div>
                          <div>
                            <p className="font-medium mb-2">Date</p>
                            <div className="border-b border-gray-400 h-6 mb-2"></div>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t">
                        <p className="font-medium">Deep Sound For Technical Consultation LLC</p>
                        <p>Phone: +962 (0) 795 4468 | Email: purchasing@nogahub.jo</p>
                        <p>Website: www.nogahub.com</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => downloadPurchaseOrderPDF(calculationResults, project)}
                      className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Download size={16} />
                      <span>Download PO for Void UK</span>
                    </button>
                  </div>
                  )}
                </div>
              )}

              {/* Action Items */}
              {isCalculated && calculationResults && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Next Steps & Action Items</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h6 className="font-medium text-gray-800 mb-2">Immediate Actions</h6>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Send quotation to client via email</li>
                        <li>• Schedule site visit and technical assessment</li>
                        <li>• Prepare contract documents (Omar)</li>
                        <li>• Set up project tracking system (Ammar)</li>
                        <li>• Assign Producer and Project Manager roles</li>
                        <li>• Create 3D models and technical drawings</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="font-medium text-gray-800 mb-2">Post-Approval Actions</h6>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Process equipment order to Void Acoustics UK</li>
                        <li>• Arrange international shipping & logistics</li>
                        <li>• Coordinate customs clearance procedures</li>
                        <li>• Schedule installation team and resources</li>
                        <li>• Prepare commissioning and testing procedures</li>
                        <li>• Document project for future reference</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-white rounded-lg border-l-4 border-black">
                    <p className="text-sm text-gray-700">
                      <strong>Business Model Note:</strong> This system implements the complete NogaHub business structure 
                      with accurate profit distribution across Void Acoustics Jordan, Nogahub, and Avecion entities 
                      according to the official business report and chart of accounts.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}

          {/* Rental Section Content */}
          {activeSection === 'rental' && (
            <div className="text-center py-20">
              <Zap size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-2xl font-semibold text-gray-700 mb-4">Rental Services</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Our rental division is currently under development. This section will include equipment rental services 
                for events, temporary installations, and short-term projects.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-lg mx-auto">
                <h4 className="font-semibold text-gray-900 mb-2">Coming Soon</h4>
                <ul className="text-left text-sm text-gray-600 space-y-1">
                  <li>• Event sound system rentals</li>
                  <li>• Temporary installation equipment</li>
                  <li>• Short-term project solutions</li>
                  <li>• Flexible rental periods</li>
                  <li>• Delivery and setup services</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={project.projectName}
                  onChange={(e) => setProject(prev => ({ ...prev, projectName: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={project.clientName}
                  onChange={(e) => setProject(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter client name"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrentProject}
                  disabled={!project.projectName.trim() || !project.clientName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Save Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NogaHubAutomation;