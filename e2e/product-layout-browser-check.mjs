/** Runs against the real hydrated storefront in Playwright or a remote browser. */
export async function runProductLayoutChecks({ language = 'en', fixture = false, phone = false } = {}) {
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
  let expectedQuantity = 2;
  if (increase.disabled) {
    check(quantity().textContent.trim() === '1' && decrease.disabled, 'single-stock quantity stays at one');
  } else {
    increase.click();
    await wait(() => quantity().textContent.trim() === '2', 'React quantity interaction');
    check(!decrease.disabled, 'quantity updates after hydration');
    decrease.click(); await wait(() => quantity().textContent.trim() === '1', 'quantity decrement');
    check(decrease.disabled, 'quantity cannot fall below one');
  }
  if (fixture) {
    const storage = buyBox.querySelector('button[aria-label="' + (language === 'ar' ? 'التخزين' : 'Storage') + ': 512GB"]');
    check(Boolean(storage && !storage.disabled), 'second variant is selectable');
    storage.click(); await wait(() => storage.getAttribute('aria-pressed') === 'true', 'variant selection');
    check(buyBox.querySelector('[data-testid="product-price"]').textContent.includes('599.00'), 'variant price follows actual selected variant');
    check(quantity().textContent.trim() === '1', 'variant selection resets quantity');
    for (let i = 1; i < 20; i++) { increase.click(); await wait(() => Number(quantity().textContent) === i + 1, 'stock bound increment'); }
    check(increase.disabled, 'quantity stops at the real stock limit');
    for (let i = 20; i > 2; i--) { decrease.click(); await wait(() => Number(quantity().textContent) === i - 1, 'stock bound decrement'); }
  } else if (phone) {
    const fields = [...buyBox.querySelectorAll('fieldset')];
    check(fields.length >= 2, 'color and capacity have named option groups');
    const color = fields[0].querySelectorAll('button')[1];
    check(Boolean(color && !color.disabled && color.textContent.trim()), 'color names remain visible');
    color.click(); await wait(() => color.getAttribute('aria-pressed') === 'true', 'color changes');
    const storage = [...fields[1].querySelectorAll('button')].find(el => !el.disabled && el.getAttribute('aria-pressed') !== 'true');
    check(Boolean(storage), 'another available capacity exists');
    storage.click(); await wait(() => storage.getAttribute('aria-pressed') === 'true', 'capacity changes');
    check(quantity().textContent.trim() === '1', 'phone selection resets quantity');
    if (increase.disabled) expectedQuantity = 1;
    else { increase.click(); await wait(() => quantity().textContent.trim() === '2', 'phone quantity increment'); }
    check(document.querySelectorAll('[data-testid="product-key-features"] strong').length === 4, 'four confirmed phone highlights appear');
  } else {
    check(buyBox.querySelectorAll('[data-testid="product-fixed-option"]').length === 2, 'single color and storage are facts instead of redundant buttons');
    check(buyBox.textContent.includes('128GB'), 'storage has a readable unit');
    check(!document.querySelector('[data-testid="product-key-features"]'), 'selected storage is not repeated as a feature');
    increase.click(); await wait(() => quantity().textContent.trim() === '2', 'quantity increment');
  }
  const question = buyBox.querySelector('[data-testid="product-question"]');
  check(question && question.getBoundingClientRect().width >= buyBox.clientWidth - 2, 'question action uses full panel width');
  check(question.scrollWidth <= question.clientWidth, 'question label is not clipped');
  check(question.getBoundingClientRect().height >= 44, 'question action meets touch target');
  const assurances = [...buyBox.querySelectorAll('[data-testid="product-assurances"] li')];
  check(assurances.length === 3 && Math.max(...assurances.map(el => el.getBoundingClientRect().top)) - Math.min(...assurances.map(el => el.getBoundingClientRect().top)) <= 1, 'three assurances share one row');
  const quickSpecs = buyBox.querySelector('[data-testid="product-view-specs"]');
  if (quickSpecs) {
    quickSpecs.click();
    const target = document.querySelector('[data-product-detail="specifications"]');
    check(target.open && document.activeElement === target.querySelector('summary'), 'all specifications opens and focuses detailed specs');
    target.querySelector('summary').click();
  }
  for (const field of buyBox.querySelectorAll('fieldset')) {
    check(field.querySelector('legend') && !field.querySelector('legend bdi'), 'option heading does not repeat selected value');
    for (const button of field.querySelectorAll('button')) check(button.getBoundingClientRect().height >= 44, 'variant meets touch target');
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
  if (innerWidth < 640) {
    check(visible(bar) && !visible(bottomNav), 'only one mobile bottom bar');
    check(Math.abs(bar.getBoundingClientRect().bottom - innerHeight) <= 1, 'purchase bar sits at the viewport bottom');
    check(visible(bar.querySelector('[data-testid="product-open-bag"]')), 'mobile cart remains reachable');
    check(bar.querySelector('button').getBoundingClientRect().height >= 44, 'mobile purchase button meets touch target');
  } else { check(!visible(bar), 'desktop and tablet use inline purchase controls'); }
  check(document.documentElement.scrollWidth <= innerWidth + 1, 'no horizontal overflow');
  check(document.documentElement.dir === (language === 'ar' ? 'rtl' : 'ltr'), 'correct writing direction');
  const panel = innerWidth < 640 ? bar : buyBox;
  const add = [...panel.querySelectorAll('button')].find(el => visible(el) && el.textContent.includes(language === 'ar' ? 'أضف إلى السلة' : 'Add to cart'));
  check(Boolean(add && !add.disabled), 'purchase action is enabled');
  add.click();
  await wait(() => JSON.parse(localStorage.getItem('space-call-cart') || '{}').state?.items?.some(item => item.quantity === expectedQuantity), 'persisted cart');
  const cart = JSON.parse(localStorage.getItem('space-call-cart')).state;
  check(cart.items.length === 1 && cart.items[0].quantity === expectedQuantity, 'cart stores exact requested quantity');
  const cartTotal = (Number(cart.items[0].price.amount) * expectedQuantity).toFixed(2);
  if (innerWidth >= 640 && innerWidth < 1024) {
    check(visible(bottomNav?.querySelector('a[href="/cart"]')), 'tablet cart remains reachable');
  } else {
  const openBag = innerWidth < 640 ? document.querySelector('[data-testid="product-open-bag"]') : [...document.querySelectorAll('button')].find(el => visible(el) && (el.getAttribute('aria-label') || '').startsWith(language === 'ar' ? 'فتح السلة,' : 'Open bag,'));
  check(Boolean(openBag), 'cart opener remains accessible'); openBag.click();
  await wait(() => visible(document.querySelector('[role="dialog"]')), 'cart drawer opens');
  const dialog = document.querySelector('[role="dialog"]');
  const formattedTotal = new Intl.NumberFormat('en-US', {style:'currency',currency:cart.items[0].price.currencyCode}).format(Number(cartTotal));
  check(dialog.textContent.includes(formattedTotal), 'cart drawer displays the correct total');
  dialog.querySelector('button').click();
  await wait(() => !visible(document.querySelector('[role="dialog"]')), 'cart drawer closes');
  }
  if (phone) {
    const chosen = [...buyBox.querySelectorAll('fieldset button[aria-pressed="true"] bdi')].map(el => el.textContent.trim());
    check(chosen.every(value => cart.items[0].selectedOptions.some(option => option.value === value)), 'cart keeps selected phone color and capacity');
    check(chosen.every(value => decodeURIComponent(question.href).includes(value)), 'WhatsApp draft contains selected phone options');
    const displayedPrice = buyBox.querySelector('[data-testid="product-price"]').textContent;
    check(displayedPrice.includes(new Intl.NumberFormat('en-US', { style: 'currency', currency: cart.items[0].price.currencyCode }).format(Number(cart.items[0].price.amount))), 'cart unit price matches selected phone price');
  }
  if (fixture) check(cart.items[0].selectedOptions.some(option => option.value === '512GB'), 'cart stores the selected variant');
  return { width: innerWidth, height: innerHeight, language, fixture, phone, checks: results, cartTotal };
}
