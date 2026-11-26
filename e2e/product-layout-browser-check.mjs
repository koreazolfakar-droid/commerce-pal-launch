/** Runs against the real hydrated storefront in Playwright or a remote browser. */
export async function runProductLayoutChecks({ language = 'en', fixture = false } = {}) {
  const results = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); results.push(name); };
  const wait = async (predicate, name) => {
    const end = Date.now() + 20000;
    while (!predicate()) { if (Date.now() > end) throw new Error('Timed out: ' + name); await new Promise(r => setTimeout(r, 50)); }
  };
  const visible = el => Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  const buyBox = document.querySelector('[data-testid="product-buy-box"]');
  check(Boolean(buyBox), 'purchase panel rendered');
  await wait(() => document.body.dataset.language === language, 'locale hydration');
  const quantity = () => document.querySelector('[data-testid="product-quantity"] [aria-live]');
  const increase = buyBox.querySelector('button[aria-label="' + (language === 'ar' ? 'زيادة الكمية' : 'Increase quantity') + '"]');
  const decrease = buyBox.querySelector('button[aria-label="' + (language === 'ar' ? 'تقليل الكمية' : 'Decrease quantity') + '"]');
  check(Boolean(increase && decrease), 'quantity controls have accessible names');
  increase.click();
  await wait(() => quantity().textContent.trim() === '2', 'React quantity interaction');
  check(!decrease.disabled, 'quantity updates after hydration');
  decrease.click(); await wait(() => quantity().textContent.trim() === '1', 'quantity decrement');
  check(decrease.disabled, 'quantity cannot fall below one');
  if (fixture) {
    const storage = buyBox.querySelector('button[aria-label="' + (language === 'ar' ? 'التخزين' : 'Storage') + ': 512GB"]');
    check(Boolean(storage && !storage.disabled), 'second variant is selectable');
    storage.click(); await wait(() => storage.getAttribute('aria-pressed') === 'true', 'variant selection');
    check(buyBox.querySelector('[data-testid="product-price"]').textContent.includes('599.00'), 'variant price follows actual selected variant');
    check(quantity().textContent.trim() === '1', 'variant selection resets quantity');
    for (let i = 1; i < 20; i++) { increase.click(); await wait(() => Number(quantity().textContent) === i + 1, 'stock bound increment'); }
    check(increase.disabled, 'quantity stops at the real stock limit');
    for (let i = 20; i > 2; i--) { decrease.click(); await wait(() => Number(quantity().textContent) === i - 1, 'stock bound decrement'); }
  } else {
    check(buyBox.querySelectorAll('[data-testid="product-fixed-option"]').length === 2, 'single color and storage are facts instead of redundant buttons');
    check(buyBox.textContent.includes('128GB'), 'storage has a readable unit');
    check(!document.querySelector('[data-testid="product-key-features"]'), 'selected storage is not repeated as a feature');
    increase.click(); await wait(() => quantity().textContent.trim() === '2', 'quantity increment');
  }
  const info = document.querySelector('[data-testid="product-information"]');
  const specs = info.querySelector('[data-product-detail="specifications"]');
  specs.querySelector('summary').click();
  check(specs.open && visible(specs.querySelector('[data-testid="product-specification-sheet"]')), 'technical details expand');
  specs.querySelector('summary').click(); check(!specs.open, 'technical details collapse');
  const delivery = info.querySelector('[data-product-detail="delivery"]');
  delivery.querySelector('summary').click();
  check(delivery.open && delivery.querySelectorAll('a').length === 3, 'delivery, warranty and returns remain accessible');
  delivery.querySelector('summary').click();
  const thumbs = document.querySelector('[data-testid="product-gallery-thumbnails"]');
  if (thumbs && thumbs.querySelectorAll('button').length > 1) {
    const second = thumbs.querySelectorAll('button')[1]; second.click();
    await wait(() => second.getAttribute('aria-pressed') === 'true', 'gallery selection');
    check(true, 'gallery thumbnails switch images');
  }
  const bar = document.querySelector('[data-testid="product-purchase-bar"]');
  const bottomNav = document.querySelector('[data-testid="bottom-nav"]');
  check(!visible(bar), 'no sticky purchase bar');
  check(visible(bottomNav) === (innerWidth < 1024), 'standard responsive navigation');
  check(document.documentElement.scrollWidth <= innerWidth + 1, 'no horizontal overflow');
  check(document.documentElement.dir === (language === 'ar' ? 'rtl' : 'ltr'), 'correct writing direction');
  const [add, buy] = buyBox.querySelectorAll('[data-testid="product-purchase-actions"] button');
  check(visible(add) && visible(buy) && !add.disabled && !buy.disabled, 'both inline purchase actions are available');
  const addBox = add.getBoundingClientRect();
  const buyBoxRect = buy.getBoundingClientRect();
  check(addBox.top === buyBoxRect.top && addBox.height === buyBoxRect.height && addBox.height >= 44, 'purchase buttons align with accessible touch targets');
  check(language === 'ar' ? addBox.left >= buyBoxRect.right : addBox.right <= buyBoxRect.left, 'purchase buttons sit side by side in reading order');
  add.click();
  await wait(() => JSON.parse(localStorage.getItem('space-call-cart') || '{}').state?.items?.some(item => item.quantity === 2), 'persisted cart');
  const cart = JSON.parse(localStorage.getItem('space-call-cart')).state;
  check(cart.items.length === 1 && cart.items[0].quantity === 2, 'cart stores exact requested quantity');
  const cartTotal = (Number(cart.items[0].price.amount) * 2).toFixed(2);
  if (innerWidth < 1024) {
    const cartLink = bottomNav?.querySelector('a[href="/cart"]');
    check(visible(cartLink), 'cart is available from mobile navigation');
    await wait(() => cartLink.querySelector('[data-testid="bottom-nav-cart-badge"]')?.textContent === '2', 'mobile cart badge reflects the selected quantity');
  } else {
    const openBag = [...document.querySelectorAll('button')].find(el => visible(el) && (el.getAttribute('aria-label') || '').startsWith(language === 'ar' ? 'فتح السلة,' : 'Open bag,'));
    check(Boolean(openBag), 'cart opener remains accessible'); openBag.click();
    await wait(() => visible(document.querySelector('[role="dialog"]')), 'cart drawer opens');
    const dialog = document.querySelector('[role="dialog"]');
    const formattedTotal = new Intl.NumberFormat('en-US', {style:'currency',currency:cart.items[0].price.currencyCode}).format(Number(cartTotal));
    check(dialog.textContent.includes(formattedTotal), 'cart drawer displays the correct total');
    dialog.querySelector('button').click();
    await wait(() => !visible(document.querySelector('[role="dialog"]')), 'cart drawer closes');
  }
  if (fixture) check(cart.items[0].selectedOptions.some(option => option.value === '512GB'), 'cart stores the selected variant');
  return { width: innerWidth, height: innerHeight, language, fixture, checks: results, cartTotal };
}
