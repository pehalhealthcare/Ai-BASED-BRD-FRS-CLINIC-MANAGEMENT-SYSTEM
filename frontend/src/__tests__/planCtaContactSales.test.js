import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Super Admin Plan: Contact Sales CTA & Book-a-Demo Workflow Specifications', () => {
  it('should resolve CTA label to Contact Sales when ctaAction is contact_sales', () => {
    const contactSalesPlan = {
      name: 'Custom Enterprise Hospital',
      code: 'ENTERPRISE_CUSTOM',
      ctaAction: 'contact_sales',
      ctaText: '',
      isEnterprise: true
    };

    const isContactSales = contactSalesPlan.ctaAction === 'contact_sales' || (!contactSalesPlan.ctaAction && contactSalesPlan.isEnterprise);
    const ctaLabel = isContactSales
      ? (contactSalesPlan.ctaText || 'Contact Sales')
      : 'Get Started';

    assert.equal(isContactSales, true);
    assert.equal(ctaLabel, 'Contact Sales');
  });

  it('should support custom button text while maintaining contact_sales behavior', () => {
    const customTextPlan = {
      name: 'Network Polyclinic',
      code: 'POLYCLINIC_OS',
      ctaAction: 'contact_sales',
      ctaText: 'Talk to Enterprise Expert'
    };

    const isContactSales = customTextPlan.ctaAction === 'contact_sales';
    const ctaLabel = isContactSales ? (customTextPlan.ctaText || 'Contact Sales') : 'Get Started';

    assert.equal(ctaLabel, 'Talk to Enterprise Expert');
  });

  it('should route contact_sales plans to /book-demo with plan query param', () => {
    const plan = {
      _id: 'plan_123',
      name: 'Enterprise Hospital OS',
      code: 'ENTERPRISE_HOSPITAL',
      ctaAction: 'contact_sales'
    };

    let targetRoute = null;
    const navigate = (path) => { targetRoute = path; };

    const handlePlanClick = (selectedPlan) => {
      const isContactSales = selectedPlan.ctaAction === 'contact_sales' || (!selectedPlan.ctaAction && selectedPlan.isEnterprise);
      if (isContactSales) {
        navigate(`/book-demo?plan=${encodeURIComponent(selectedPlan.code || selectedPlan._id || selectedPlan.name)}`);
        return;
      }
      navigate('/register-clinic');
    };

    handlePlanClick(plan);
    assert.equal(targetRoute, '/book-demo?plan=ENTERPRISE_HOSPITAL');
  });

  it('should route standard setup_clinic plans to clinic registration / onboarding', () => {
    const standardPlan = {
      _id: 'plan_456',
      name: 'AI Starter Clinic',
      code: 'STARTER',
      ctaAction: 'setup_clinic'
    };

    let targetRoute = null;
    const navigate = (path) => { targetRoute = path; };

    const handlePlanClick = (selectedPlan) => {
      const isContactSales = selectedPlan.ctaAction === 'contact_sales' || (!selectedPlan.ctaAction && selectedPlan.isEnterprise);
      if (isContactSales) {
        navigate(`/book-demo?plan=${encodeURIComponent(selectedPlan.code || selectedPlan._id || selectedPlan.name)}`);
        return;
      }
      navigate(`/register-clinic?plan=${selectedPlan.code}`);
    };

    handlePlanClick(standardPlan);
    assert.equal(targetRoute, '/register-clinic?plan=STARTER');
  });

  it('should pre-populate demo inquiry topic when requestedPlan query param is present on /book-demo', () => {
    const requestedPlan = 'ENTERPRISE_HOSPITAL';
    const initialFormData = {
      fullName: '',
      workEmail: '',
      phoneNumber: '',
      clinicName: '',
      doctorsCount: '',
      topics: requestedPlan ? `Inquiring about ${requestedPlan} Plan` : '',
      privacyConsent: false
    };

    assert.equal(initialFormData.topics, 'Inquiring about ENTERPRISE_HOSPITAL Plan');
  });

  it('should reflect custom ctaText for AI Professional Clinic overriding default Start Free Trial', () => {
    const professionalPlan = {
      name: 'AI Professional Clinic',
      code: 'PROFESSIONAL',
      isPopular: true,
      badge: 'MOST POPULAR',
      ctaAction: 'setup_clinic',
      ctaText: 'Get Started Today'
    };

    const isContactSales = professionalPlan.ctaAction === 'contact_sales' || (!professionalPlan.ctaAction && professionalPlan.isEnterprise);
    const customCta = typeof professionalPlan.ctaText === 'string' && professionalPlan.ctaText.trim().length > 0 ? professionalPlan.ctaText.trim() : null;
    const ctaLabel = customCta || (isContactSales
      ? 'Contact Sales'
      : (professionalPlan.isPopular
          ? 'Start Free Trial'
          : (professionalPlan.code === 'PREMIUM' ? 'Upgrade Now' : 'Get Started')));

    assert.equal(ctaLabel, 'Get Started Today');
  });

  it('should fallback to Start Free Trial when ctaText is empty string for AI Professional Clinic', () => {
    const professionalPlan = {
      name: 'AI Professional Clinic',
      code: 'PROFESSIONAL',
      isPopular: true,
      badge: 'MOST POPULAR',
      ctaAction: 'setup_clinic',
      ctaText: '   '
    };

    const isContactSales = professionalPlan.ctaAction === 'contact_sales' || (!professionalPlan.ctaAction && professionalPlan.isEnterprise);
    const customCta = typeof professionalPlan.ctaText === 'string' && professionalPlan.ctaText.trim().length > 0 ? professionalPlan.ctaText.trim() : null;
    const ctaLabel = customCta || (isContactSales
      ? 'Contact Sales'
      : (professionalPlan.isPopular
          ? 'Start Free Trial'
          : (professionalPlan.code === 'PREMIUM' ? 'Upgrade Now' : 'Get Started')));

    assert.equal(ctaLabel, 'Start Free Trial');
  });

  it('should reflect custom ctaText for AI Premium Clinic overriding hardcoded Upgrade Now', () => {
    const premiumPlan = {
      name: 'AI Premium Clinic',
      code: 'PREMIUM',
      ctaAction: 'setup_clinic',
      ctaText: 'Switch to Premium'
    };

    const isContactSales = premiumPlan.ctaAction === 'contact_sales' || (!premiumPlan.ctaAction && premiumPlan.isEnterprise);
    const customCta = typeof premiumPlan.ctaText === 'string' && premiumPlan.ctaText.trim().length > 0 ? premiumPlan.ctaText.trim() : null;
    const ctaLabel = customCta || (isContactSales
      ? 'Contact Sales'
      : (premiumPlan.isPopular
          ? 'Start Free Trial'
          : (premiumPlan.code === 'PREMIUM' ? 'Upgrade Now' : 'Get Started')));

    assert.equal(ctaLabel, 'Switch to Premium');
  });
});

