import heroDesktop from '../assets/aicms_image_1.svg';
import productShowcase from '../assets/aicms_image_2.svg';
import blueBackground from '../assets/aicms_blue_background.svg';
import laptopDevice from '../assets/aicms_laptop_device.svg';
import heroDoctor from '../assets/aicms_image_3.svg';
import heroDevices from '../assets/aicms_image_4.svg';
import solutionGeneral from '../assets/aicms_image_5.svg';
import solutionMultiSpecialty from '../assets/aicms_image_6.svg';
import solutionDiagnostic from '../assets/aicms_image_7.svg';
import solutionDental from '../assets/aicms_image_dental.svg';

// New two-layer hero assets (doctor portrait + background canvas)
import doctorHero from '../assets/aicms_doctor_hero.svg';
import medicalBackground from '../assets/aicms_medical_background.svg';

export const responsiveAssets = {
  hero: {
    desktop: heroDesktop,
    tablet: heroDesktop,
    mobile: heroDesktop,
    doctor: heroDoctor,
    devices: heroDevices,
    // Two-layer composition assets
    doctorHero,
    medicalBackground,
  },
  product: {
    desktop: laptopDevice,
    background: blueBackground,
    device: laptopDevice,
    fullBanner: productShowcase,
    tablet: laptopDevice,
    mobile: laptopDevice,
  },
  solutions: {
    general: solutionGeneral,
    multiSpecialty: solutionMultiSpecialty,
    diagnostic: solutionDiagnostic,
    dental: solutionDental,
  },
};

export default responsiveAssets;
