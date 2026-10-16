/**
 * Madhavbaug Livo-O-Safe SHOTS - High Conversion COD Landing Page Logic
 * Features:
 * 1. Single Hero Showcase / Interactive Showcase
 * 2. Pricing & Bundle Sync (1 Box, 2 Boxes - Most Popular, 4 Boxes - Best Value)
 * 3. Unified COD Lead Modal with Name, Contact, Address, City, State
 * 4. 24-Hour Duplicate Prevention by Contact Number
 * 5. Google Sheets Webhook Integration
 * 6. Sticky Mobile Bar, Review Filtering & Accordion FAQs
 */

// ==============================================================================
// GOOGLE SHEETS WEBHOOK CONFIGURATION
// ==============================================================================
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxXE6vxtMT09S1eQDsL0KMEY7nMSsFhYFTc_uX9YamRQeuyv6Xvu5Uowu3pdHVaUkKbwQ/exec';

// Local Storage Key & 24 Hours Cooldown (24 * 60 * 60 * 1000 ms)
const SUBMITTED_CONTACTS_KEY = 'madhavbaug_livo_safe_contacts_24h';
const DUPLICATE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. Pricing & Bundle Selector State
  // ==========================================================================
  const bundleCards = document.querySelectorAll('.bundle-card');
  const formPackCards = document.querySelectorAll('.form-pack-card');
  const currentPriceEl = document.getElementById('currentPrice');
  const originalPriceEl = document.getElementById('originalPrice');
  const discountTagEl = document.getElementById('discountTag');
  const stickyPriceEl = document.getElementById('stickyPrice');
  const stickyPackNameEl = document.getElementById('stickyPackName');

  const bundleData = [
    {
      index: 0,
      title: '1 Pack (Pack of 30 Shots for 30 Days)',
      shots: 30,
      price: 899,
      original: 1299,
      discount: '31% की छूट',
      desc: '1 Month Starter: Pack of 30 Shots for 30 Days'
    },
    {
      index: 1,
      title: '2 Packs (60 Days Course - 2x Pack of 30 Shots for 30 Days)',
      shots: 60,
      price: 1599,
      original: 2598,
      discount: '38% की सबसे बड़ी छूट',
      desc: 'Most Popular: 60 Days Complete Liver Detox & Fatty Liver Cleanse'
    },
    {
      index: 2,
      title: '4 Packs (120 Days Course - 4x Pack of 30 Shots for 30 Days)',
      shots: 120,
      price: 2899,
      original: 5196,
      discount: '44% की महा छूट',
      desc: 'Best Value: 120 Days Deep Hepatocellular Repair & Cirrhosis Defense'
    }
  ];

  let selectedBundleIndex = 1; // Default: 2 Boxes (Most Popular)

  function updateBundleState(index) {
    selectedBundleIndex = index;
    const data = bundleData[index];

    // Update Hero UI
    if (currentPriceEl) currentPriceEl.textContent = `₹${data.price.toLocaleString('en-IN')}`;
    if (originalPriceEl) originalPriceEl.textContent = `₹${data.original.toLocaleString('en-IN')}`;
    if (discountTagEl) discountTagEl.textContent = data.discount;

    // Update Sticky Bar
    if (stickyPriceEl) stickyPriceEl.textContent = `₹${data.price.toLocaleString('en-IN')}`;
    if (stickyPackNameEl) stickyPackNameEl.textContent = data.title;

    // Update Active Card Highlights
    bundleCards.forEach(card => {
      const cardIndex = parseInt(card.getAttribute('data-index'), 10);
      card.classList.toggle('active', cardIndex === index);
    });

    formPackCards.forEach(card => {
      const cardIndex = parseInt(card.getAttribute('data-index'), 10);
      card.classList.toggle('active', cardIndex === index);
    });

    // Update Hidden Form Inputs
    const hiddenPack = document.getElementById('modalSelectedPack');
    const hiddenPrice = document.getElementById('modalPrice');
    if (hiddenPack) hiddenPack.value = data.title;
    if (hiddenPrice) hiddenPrice.value = `₹${data.price}`;
  }

  // Click handler for Hero Bundle Cards
  bundleCards.forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.getAttribute('data-index'), 10);
      updateBundleState(index);
    });
  });

  // Click handler for Modal Package Cards
  formPackCards.forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.getAttribute('data-index'), 10);
      updateBundleState(index);
    });
  });

  // Initialize Default Bundle (2 Boxes)
  updateBundleState(1);

  // ==========================================================================
  // 2. 24-Hour Duplicate Prevention Helper Functions
  // ==========================================================================
  function getSubmittedContacts() {
    try {
      const stored = localStorage.getItem(SUBMITTED_CONTACTS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  function saveSubmittedContact(phone) {
    try {
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      const contacts = getSubmittedContacts();
      contacts[cleanPhone] = Date.now();
      localStorage.setItem(SUBMITTED_CONTACTS_KEY, JSON.stringify(contacts));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  function checkDuplicateContact(phone) {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) return false;
    const contacts = getSubmittedContacts();
    const timestamp = contacts[cleanPhone];
    if (timestamp && (Date.now() - timestamp < DUPLICATE_COOLDOWN_MS)) {
      return true; // Duplicate detected within 24 hours
    }
    return false;
  }

  // Real-time Duplicate Contact Checking on Input
  const modalPhoneInput = document.getElementById('modalCodPhone');
  const duplicateAlert = document.getElementById('modalDuplicateAlert');

  if (modalPhoneInput) {
    modalPhoneInput.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(-10);
      if (val.length === 10) {
        if (checkDuplicateContact(val)) {
          if (duplicateAlert) duplicateAlert.style.display = 'block';
        } else {
          if (duplicateAlert) duplicateAlert.style.display = 'none';
        }
      } else {
        if (duplicateAlert) duplicateAlert.style.display = 'none';
      }
    });
  }

  // ==========================================================================
  // 3. Unified Modal Management (COD Form & Thank You Confirmation)
  // ==========================================================================
  const codModal = document.getElementById('codModal');
  const thankYouModal = document.getElementById('thankYouModal');
  const codModalClose = document.getElementById('codModalClose');
  const thankYouModalClose = document.getElementById('thankYouModalClose');
  const thankYouModalDoneBtn = document.getElementById('thankYouModalDoneBtn');

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Open Modal Buttons (.btn-buy-now, #heroBuyNow, #stickyBuyNow, etc.)
  document.querySelectorAll('.btn-buy-now, .hero-buy-now-btn, .sticky-buy-btn, #navCtaBtn, #sectionCodBuyBtn, #finalCodBuyBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(codModal);
    });
  });

  if (codModalClose) codModalClose.addEventListener('click', () => closeModal(codModal));
  if (thankYouModalClose) thankYouModalClose.addEventListener('click', () => closeModal(thankYouModal));
  if (thankYouModalDoneBtn) thankYouModalDoneBtn.addEventListener('click', () => closeModal(thankYouModal));

  // Close modal on overlay background click
  [codModal, thankYouModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    }
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [codModal, thankYouModal].forEach(modal => {
        if (modal && modal.classList.contains('active')) closeModal(modal);
      });
    }
  });

  // ==========================================================================
  // 4. COD Order Submission (Lead Webhook + 24hr Prevention + Thank You)
  // ==========================================================================
  const modalCodForm = document.getElementById('modalCodForm');

  function generateOrderId() {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `MDB-LIV-${randomNum}`;
  }

  function handleOrderSuccess(name, phone, address, city, state, packTitle, amount, orderId) {
    // Populate Thank You Modal
    const tyOrderId = document.getElementById('thankYouOrderId');
    const tyCustomerName = document.getElementById('thankYouCustomerName');
    const tyPhone = document.getElementById('thankYouPhone');
    const tyPack = document.getElementById('thankYouPack');
    const tyAmount = document.getElementById('thankYouAmount');
    const waShareBtn = document.getElementById('whatsappConfirmBtn');

    const addressParts = [address, city, state].filter(Boolean);
    const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : 'कूरियर टीम द्वारा कॉल पर पता लिया जाएगा';
    const cityStateText = [city, state].filter(Boolean).join(', ') || 'Liver Care Verification Call';

    if (tyOrderId) tyOrderId.textContent = orderId;
    if (tyCustomerName) tyCustomerName.textContent = name || 'प्रिय ग्राहक';
    if (tyPhone) tyPhone.textContent = `+91 ${phone}`;
    if (tyPack) tyPack.textContent = packTitle;
    if (tyAmount) tyAmount.textContent = `₹${amount.toLocaleString('en-IN')}`;

    if (waShareBtn) {
      const waText = encodeURIComponent(
        `नमस्ते Madhavbaug! मैंने Liv-Revive Shots का Cash On Delivery ऑर्डर किया है:\n` +
        `Order ID: ${orderId}\n` +
        `Pack: ${packTitle}\n` +
        `Amount: ₹${amount}\n` +
        `Name: ${name}\n` +
        `Address: ${formattedAddress}\n` +
        `City/State: ${cityStateText}`
      );
      waShareBtn.href = `https://wa.me/919321456789?text=${waText}`;
    }

    closeModal(codModal);
    openModal(thankYouModal);
    showToast('✓ Cash on Delivery ऑर्डर दर्ज हो गया है!');
  }

  if (modalCodForm) {
    modalCodForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('modalCodName')?.value.trim() || '';
      const phone = document.getElementById('modalCodPhone')?.value.trim() || '';
      const address = document.getElementById('modalCodAddress')?.value.trim() || '';
      const city = document.getElementById('modalCodCity')?.value.trim() || '';
      const state = document.getElementById('modalCodState')?.value.trim() || '';
      const bundle = bundleData[selectedBundleIndex] || bundleData[1];

      // 1. Check if contact number was already submitted within 24 hours
      if (checkDuplicateContact(phone)) {
        if (duplicateAlert) duplicateAlert.style.display = 'block';
        showToast('⚠️ Already submitted form. Wait for 24hr, our liver health expert will call you.');
        return;
      }

      const submitBtn = document.getElementById('modalSubmitBtn');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.innerHTML = '⏳ ऑर्डर दर्ज हो रहा है...';
        submitBtn.disabled = true;
      }

      const orderId = generateOrderId();
      const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // Lead data payload
      const leadData = {
        timestamp: now,
        orderId: orderId,
        name: name,
        contact: phone,
        address: address || '-',
        city: city || '-',
        state: state || '-',
        package: bundle.title,
        price: `₹${bundle.price}`,
        paymentMode: 'Cash On Delivery (COD)',
        pageUrl: window.location.href
      };

      // 2. Post to Google Sheets Webhook
      if (GOOGLE_SHEETS_WEBHOOK_URL && GOOGLE_SHEETS_WEBHOOK_URL.trim() !== '') {
        try {
          await fetch(GOOGLE_SHEETS_WEBHOOK_URL.trim(), {
            method: 'POST',
            mode: 'no-cors', // standard for Google Apps Script Web App
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(leadData)
          });
          console.log('Lead successfully sent to Google Sheets Webhook:', leadData);
        } catch (err) {
          console.error('Error posting lead to Google Sheets:', err);
        }
      }

      // 3. Mark contact as submitted for 24-hr prevention
      saveSubmittedContact(phone);

      // 4. Restore button and show Thank You confirmation modal
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }

      handleOrderSuccess(name, phone, address, city, state, bundle.title, bundle.price, orderId);
    });
  }

  // ==========================================================================
  // 5. Sticky Bottom Bar Visibility on Scroll (Mobile & Desktop)
  // ==========================================================================
  const stickyBar = document.getElementById('stickyMobileBar');
  const heroSection = document.getElementById('product-hero');

  if (stickyBar && heroSection) {
    window.addEventListener('scroll', () => {
      const heroBottom = heroSection.getBoundingClientRect().bottom;
      if (heroBottom < 100) {
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    });
  }

  // ==========================================================================
  // 6. Accordion FAQ Functionality
  // ==========================================================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question-btn, .faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        // Close others
        faqItems.forEach(other => other.classList.remove('active'));
        // Toggle current
        if (!isOpen) {
          item.classList.add('active');
        }
      });
    }
  });

  // ==========================================================================
  // 7. Customer Review Filters
  // ==========================================================================
  const filterBtns = document.querySelectorAll('.review-filter-btn');
  const reviewCards = document.querySelectorAll('.review-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');

      reviewCards.forEach(card => {
        if (filter === 'all' || card.getAttribute('data-category') === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // ==========================================================================
  // 8. Toast Notification Helper
  // ==========================================================================
  function showToast(msg) {
    let toast = document.getElementById('toastNotice');
    let toastMsg = document.getElementById('toastMsg');
    if (!toast) return;
    if (toastMsg) toastMsg.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
  window.showToast = showToast;
});
