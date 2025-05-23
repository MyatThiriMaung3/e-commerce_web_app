const filterState = {
    search: '',
    categories: [],
    minPrice: '',
    maxPrice: '',
    minRating: '',
    maxRating: '',
  };

  let sort_by_global = 'price';
  let order_global = 'desc';
  let currentPage = 1;
  const itemsPerPage = 20;

function openForgotPasswordPopup() {
    document.getElementById("forgotPasswordPopup").style.display = "flex";
}

function closePopup(tempPopup) {
    document.getElementById(tempPopup).style.display = "none";
}

function hideItem(hideItem) {
    document.getElementById(hideItem).classList.add('hidden');
}

function showItem(showItem) {
  document.getElementById(showItem).classList.remove('hidden');
}

// dialog show function
function confirmAndSubmit(formId, title, message, confirmText = 'Delete', icon = 'error') {
  Swal.fire({
          title: title,
          text: message,
          icon: icon,
          showCancelButton: true,
          confirmButtonText: confirmText,
          cancelButtonText: 'Cancel',
          reverseButtons: true, // Confirm on right, cancel on left
          customClass: {
            confirmButton: 'bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-sm ml-2',
            cancelButton: 'px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition shadow-sm mr-2'
          },
          buttonsStyling: false
        }).then((result) => {
          if (result.isConfirmed) {
            document.getElementById(formId).submit();
          }
        });
      }


function toggleTab(showTab, hideTab, chosenTab, unchosenTab) {
      const showVariantDiv = document.getElementById(showTab);
      showVariantDiv.style.display = 'block';

      const hideVariantDiv = document.getElementById(hideTab);
      hideVariantDiv.style.display = 'none';

      const btnChosen = document.getElementById(chosenTab);
      const btnUnchosen = document.getElementById(unchosenTab);

      // Chosen tab styles
      btnChosen.className = 'inline-block py-2 px-4 text-sm font-medium text-center border-b-2 border-red-500 rounded-t-lg active';

      // Unchosen tab styles
      btnUnchosen.className = 'inline-block py-2 px-4 text-sm font-medium text-center text-gray-800 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300';
      
    }

    function selectVariant(button, description, firstVariantImage, variantStock, variantId, variantName, variantPrice) {
      document.getElementById('product-variant-id').value = variantId;
      document.getElementById('product-variant-name').value = variantName;
      document.getElementById('product-price').value = variantPrice;

      // Remove active styles from all buttons
      document.querySelectorAll('#variant-buttons .size-btn').forEach(btn => {
        btn.className = 'size-btn px-4 py-2 border rounded-md focus:outline-none bg-white text-gray-700 hover:bg-gray-100';
      });

      // Add active style to clicked button
      button.className = 'size-btn px-4 py-2 border rounded-md focus:outline-none bg-red-500 text-white';

      // Update the description text
      document.getElementById('variant-description').textContent = description;

      // Update the main product image
      const mainImage = document.getElementById('main-product-image');
      // const selectedImage = button.getElementById(firstVariantImageId).src;
      mainImage.src = firstVariantImage;

      const stock = document.getElementById('stock');
      stock.textContent = variantStock + ' Stocks left';
      stock.className = 'ml-4 ' + (variantStock < 5 ? 'text-red-500' : 'text-green-500') + ' font-medium'; 

      const price = document.getElementById('product-variant-price');
      price.textContent = Number(variantPrice).toLocaleString() + ' VND';

    }

// script functions for the product details page
// Image gallery functionality
function changeMainImage(src) {
    document.getElementById('main-product-image').src = src;
    
    // Update active thumbnail
    const thumbnails = document.querySelectorAll('.product-image-thumbnail');
    thumbnails.forEach(thumb => {
      if (thumb.querySelector('img').src === src) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  }
  
// Quantity buttons
  function incrementQuantity() {
    const hiddenInputQuantity = document.getElementById('product-quantity');
    const input = document.getElementById('quantity');
    if (input.value < 99) {
      input.value = parseInt(input.value) + 1;
      hiddenInputQuantity.value = input.value;
    }
  }
  
  function decrementQuantity() {
    const hiddenInputQuantity = document.getElementById('product-quantity');
    const input = document.getElementById('quantity');
    if (input.value > 1) {
      input.value = parseInt(input.value) - 1;
      hiddenInputQuantity.value = input.value;
    }
  }

  // Function to map sort options to query parameters
  function mapSortToQuery(sort) {
    switch (sort) {
      case 'price_low_to_high':
        return { sort_by: 'price', order: 'asc' };
      case 'price_high_to_low':
        return { sort_by: 'price', order: 'desc' };
      case 'name_a_to_z':
        return { sort_by: 'name', order: 'asc' };
      case 'name_z_to_a':
        return { sort_by: 'name', order: 'desc' };
      case 'newest_first':
        return { sort_by: 'updated', order: 'desc' };
      case 'oldest_first':
        return { sort_by: 'updated', order: 'asc' };
      case 'rating_low_to_high':
        return { sort_by: 'rating', order: 'asc' };
      case 'rating_high_to_low':
        return { sort_by: 'rating', order: 'desc' };
      case 'sales_high_to_low':
        return { sort_by: 'sales', order: 'desc' };
      default:
        return { sort_by: 'updated', order: 'desc' }; // default sort
    }
  }

  // Function to update products on the page
  function updateProductsOnPage(products) {
    const container = document.getElementById('productList');
    container.innerHTML = ''; // Clear existing products

    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'bg-white rounded-lg shadow-md overflow-hidden product-card';
      productCard.onclick = () => location.href = `details/${product._id}`;

      // Calculate star ratings
      const fullStars = Math.floor(product.rating.average);
      const halfStar = product.rating.average % 1 >= 0.5;
      const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

      // Generate stars HTML
      let starsHtml = '';
      for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fas fa-star"></i>';
      if (halfStar) starsHtml += '<i class="fas fa-star-half-alt"></i>';
      for (let i = 0; i < emptyStars; i++) starsHtml += '<i class="far fa-star"></i>';

      productCard.innerHTML = `
        <div class="relative">
          <img src="/images/${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
        </div>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">${product.name}</h3>
          <p class="font-semibold text-gray-600 text-sm mb-3">${product.tag}</p>
          <p class="text-gray-600 text-sm mb-3">${product.description}</p>
          <div class="flex items-center mb-2">
            <span class="text-red-500 font-semibold">${product.price.toLocaleString()} VND</span>
          </div>
          <div class="flex items-center mb-3">
            <div class="star-rating flex items-center space-x-1 text-yellow-500">
              ${starsHtml}
              <span class="star-rating mr-1">(${product.rating.average.toFixed(1)})</span>
            </div>
            <span class="text-gray-600 text-sm ml-4">(${product.rating.count})</span>
            <span class="text-gray-600 text-sm ml-4">(${product.sales} sold)</span>
          </div>
        </div>
      `;

      container.appendChild(productCard);
    });
  }



// Fetch filtered products with pagination
async function fetchFilteredProducts() {
  try {
    const params = new URLSearchParams();

    // Assuming `filterState` has the current filters for search, price, etc.
    if (filterState.search) params.append('search', filterState.search);
    if (filterState.minPrice) params.append('minPrice', filterState.minPrice);
    if (filterState.maxPrice) params.append('maxPrice', filterState.maxPrice);
    if (filterState.minRating) params.append('minRating', filterState.minRating);
    if (filterState.maxRating) params.append('maxRating', filterState.maxRating);

    // Handle category selection
    let categories = [...filterState.categories];

    categories.forEach(cat => params.append('category', cat));

    // Pagination parameters
    params.append('page', currentPage);
    params.append('limit', itemsPerPage);

    // Optional sorting
    params.append('sort_by', sort_by_global);
    params.append('order', order_global);

    // Fetch products from the API
    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();

    updateProductsOnPage(data.products);  // Update products list
    updatePaginationControls(data.currentPage, data.totalPages, data.totalProducts);  // Update pagination controls
  } catch (err) {
    console.error("Failed to fetch products:", err);
  }
}

// Update pagination controls (Previous, Page numbers, Next)
function updatePaginationControls(currentPage, totalPages, totalProducts) {
  const paginationContainer = document.getElementById('pagination-container');
  paginationContainer.innerHTML = '';  // Clear existing buttons

  const infoDiv = document.createElement('div');
  infoDiv.className = 'text-sm text-gray-700';
  infoDiv.innerHTML = `Showing page <span class="font-medium">${currentPage}</span> of <span class="font-medium">${totalPages}</span> | Total products: <span class="font-medium">${totalProducts}</span>`;
  paginationContainer.appendChild(infoDiv);

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex space-x-2';

  // Previous Button
  const prevBtn = document.createElement('button');
  prevBtn.innerText = 'Previous';
  prevBtn.className = `px-4 py-2 rounded-lg shadow-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 transition'}`;
  prevBtn.disabled = currentPage === 1;
  if (currentPage > 1) {
    prevBtn.onclick = () => goToPage(currentPage - 1);  // Move to the previous page
  }
  buttonContainer.appendChild(prevBtn);

  // Page Buttons
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.innerText = i;
    if (i === currentPage) {
      btn.className = 'px-4 py-2 bg-red-500 text-white rounded-lg shadow-sm';
    } else {
      btn.className = 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition shadow-sm';
      btn.onclick = () => goToPage(i);  // Go to the selected page
    }
    buttonContainer.appendChild(btn);
  }

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.innerText = 'Next';
  nextBtn.className = `px-4 py-2 rounded-lg shadow-sm ${currentPage === totalPages ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 transition'}`;
  nextBtn.disabled = currentPage === totalPages;
  if (currentPage < totalPages) {
    nextBtn.onclick = () => goToPage(currentPage + 1);  // Move to the next page
  }
  buttonContainer.appendChild(nextBtn);

  paginationContainer.appendChild(buttonContainer);
}

// Function to navigate to a specific page
async function goToPage(page) {
  currentPage = page;  // Update the current page
  await fetchFilteredProducts();  // Fetch products for the updated page
}

function goToPagePagination(page) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  window.location.href = url.toString();
}

function addVariant() {
        const variantDiv = document.querySelector('.add-variant');
        variantDiv.style.display = 'block';
        const btnAddVariant = document.getElementById('btnAddVariant');
        btnAddVariant.style.display = "none";
    }

    function cancelAddVariant(button) {
        const variantDiv = document.querySelector('.add-variant');
        variantDiv.style.display = 'none';
        const btnAddVariant = document.getElementById('btnAddVariant');
        btnAddVariant.style.display = "block";
    }

    function deleteVariant(button) {
        const variantDiv = button.parentElement;
        variantDiv.remove();
    }

document.addEventListener('DOMContentLoaded', function() {

  // account page functions
  // variables getting by element ids from the ejs file
    const addAddressBtn = document.getElementById('add-address-btn');
    const addressForm = document.getElementById('address-form');
    const cancelAddressBtn = document.getElementById('cancel-address-btn');
    const editAddressBtns = document.querySelectorAll('.edit-address');
    const addressFormContainer = document.getElementById('address-form');

    const sortDropdown = document.getElementById("sortDropdown");
    const searchField = document.getElementById('search');
    const categorySelector = document.querySelectorAll('.filter-checkbox');
    const minPriceField = document.getElementById('min-price');
    const maxPriceField = document.getElementById('max-price');
    const minRatingField = document.getElementById('min-rating');
    const maxRatingField = document.getElementById('max-rating');
    const filterButton = document.getElementById('btnFilter');
    const searchIconButton = document.querySelector('.fa-search');
    const printBtn = document.getElementById("print-btn");


    // const { bestSellingLabels, bestSellingsData, productSoldByCatLabels, productSoldByCatData, revenueProfitLabels, revenueProfitDataRevenue, revenueProfitDataProfit, ordersChartLabels, ordersChartData } = window.chartData;
    const chartData = window.chartData || {};
    const {
      bestSellingLabels,
      bestSellingsData,
      productSoldByCatLabels,
      productSoldByCatData,
      revenueProfitLabels,
      revenueProfitDataRevenue,
      revenueProfitDataProfit,
      ordersChartLabels,
      ordersChartData
    } = chartData;

    const ctx1 = document.getElementById('bestSellingChart');
    if (ctx1) {
      new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: bestSellingLabels,
          datasets: [{
            label: 'Types',
            data: bestSellingsData,
            backgroundColor: ['#BFDBFE', '#A7F3D0', '#FDE68A', '#FCA5A5', '#C7D2FE']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
    }

    const ctx2 = document.getElementById('revenueProfitChart');
    if (ctx2) {
      new Chart(ctx2, {
        type: 'line',
        data: {
          labels: revenueProfitLabels,
          datasets: [
            {
              label: 'Revenue',
              data: revenueProfitDataRevenue,
              borderColor: '#BFDBFE',
              fill: false
            },
            {
              label: 'Profit',
              data: revenueProfitDataProfit,
              borderColor: '#A7F3D0',
              fill: false
            }
          ]
        },
        options: {
          responsive: true
        }
      });
    }

    const ctx3 = document.getElementById('productTypeChart');
    if (ctx3) {
      new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: productSoldByCatLabels,
          datasets: [{
            label: 'Units Sold',
            data: productSoldByCatData,
            backgroundColor: [
              '#BFDBFE', '#A7F3D0', '#FDE68A', '#FCA5A5', '#C7D2FE', '#DDD6FE',
              '#FDBA74', '#86EFAC', '#93C5FD', '#F9A8D4', '#6EE7B7', '#FCD34D',
              '#FECACA', '#D8B4FE', '#F87171', '#A5F3FC', '#D1D5DB', '#BBF7D0'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } }
        }
      });
    }

    const ctx4 = document.getElementById('ordersChart');
    if (ctx4) {
      new Chart(ctx4, {
        type: 'bar',
        data: {
          labels: ordersChartLabels,
          datasets: [{
            label: 'Orders',
            data: ordersChartData,
            backgroundColor: '#FCA5A5'
          }]
        }
      });
    }


    const applyBtn = document.getElementById('apply-coupon');
    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
    const code = document.getElementById('coupon-code').value.trim();
    if (!code) {
      showNotification('Please enter a coupon code.', true);
      return;
    }

      fetch('/admin/check-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
            console.log('success');

          if (data.discountUsedCount >= data.discountMaxUsage) {
            showNotification('Discount code max usage limit is over.', true);
            return;
          }
          // Update existing hidden input values
          document.getElementById('discountId').value = data.discountId;
          document.getElementById('discountCode').value = data.discountCode;
          document.getElementById('discountAmount').value = data.discountAmount;

          document.getElementById('discountAmountValue').textContent = `-${parseInt(data.discountAmount).toLocaleString()} VND`;

          // Parse current total
          const totalText = document.getElementById('totalAmount').textContent;
          const currentTotal = parseFloat(totalText.replace(/[^\d.]/g, '')); // Keep the decimal
          const newTotal = currentTotal - parseInt(data.discountAmount);

          // Update the total
          document.getElementById('totalAmount').textContent = `${newTotal.toLocaleString()} VND`;

        } else {
          showNotification(data.message, true);
        } 
      })
      .catch(err => {
        console.error('An error occurred while checking the discount: ', err.message);
        showNotification('An error occurred while checking the discount.', true);
      });

  });

    }

    const applyPointsBtn = document.getElementById('apply-points');
if (applyPointsBtn) {
  applyPointsBtn.addEventListener('click', async () => {
    const currentPointsElement = document.getElementById('currentLoyaltyPoints');
    const currentPoints = parseFloat(currentPointsElement.textContent.replace(/[^\d.]/g, '')) || 0;
    const discountedLoyaltyPointsValue = currentPoints * 1000;

    // Update the hidden input or form field
    document.getElementById('loyaltyPointsAmount').value = discountedLoyaltyPointsValue;

    // Update displayed loyalty discount
    document.getElementById('loyaltyPointsAmountValue').textContent = `-${parseInt(discountedLoyaltyPointsValue).toLocaleString()} VND`;

    // Get current total
    const totalText = document.getElementById('totalAmount').textContent;
    const currentTotal = parseFloat(totalText.replace(/[^\d.]/g, '')) || 0;

    // Subtract loyalty discount
    let newTotal = currentTotal - parseInt(discountedLoyaltyPointsValue);

    newTotal = (newTotal < 0) ? 0: newTotal;

    // Update displayed total
    document.getElementById('totalAmount').textContent = `${newTotal.toLocaleString()} VND`;
  });
}
    


    if (printBtn) {
      printBtn.addEventListener("click", function () {
        window.print();
      });
    }

    const timeFilter = document.getElementById('timeFilter');
    const filterForm = document.getElementById('filterForm');
    const customRange = document.getElementById('customRange');

    if (timeFilter) {
      timeFilter.addEventListener('change', () => {
        if (timeFilter.value === 'custom') {
          customRange.classList.remove('hidden');
        } else {
          customRange.classList.add('hidden');
          filterForm.submit();
        }
      });
    }

    const dateFilter = document.getElementById('dateFilter');
    const dateFilterForm = document.getElementById('dateFilterForm');
    const dateFilterCustomRange = document.getElementById('dateFilterCustomRange');

    if (dateFilter) {
      dateFilter.addEventListener('change', () => {
        if (dateFilter.value === 'custom') {
          dateFilterCustomRange.classList.remove('hidden');
        } else {
          dateFilterCustomRange.classList.add('hidden');
          dateFilterForm.submit();
        }
      });
    }

    
    if (addAddressBtn) {
      // Add New Address
    addAddressBtn.addEventListener('click', function() {
      addressForm.classList.remove('hidden');
      addressForm.querySelector('h3').textContent = 'Add New Address';
      // Reset form
      addressForm.querySelectorAll('input[type="text"], input[type="tel"]').forEach(input => {
        input.value = '';
      });
      addressForm.querySelector('input[type="checkbox"]').checked = false;

      console.log('Add Address button clicked');
    });
    
    // Cancel
    cancelAddressBtn.addEventListener('click', function() {
      addressForm.classList.add('hidden');
    });
  
    
    // Edit Address
    editAddressBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const addressId = this.dataset.id;

        // Update form action
        addressForm.closest('form').action = '/user-address-edit';

        // Update heading
        addressFormContainer.querySelector('h3').textContent = 'Edit Address';

        // Fill in form fields
        addressForm.closest('form').querySelector('input[name="title"]').value = this.dataset.title || '';
        addressForm.closest('form').querySelector('input[name="address"]').value = this.dataset.address || '';
        addressForm.closest('form').querySelector('input[name="city"]').value = this.dataset.city || '';
        addressForm.closest('form').querySelector('input[name="state"]').value = this.dataset.state || '';
        addressForm.closest('form').querySelector('input[name="zip"]').value = this.dataset.zip || '';

        // Add or update hidden input for ID
        let hiddenIdInput = addressForm.closest('form').querySelector('input[name="addressId"]');
        if (!hiddenIdInput) {
          hiddenIdInput = document.createElement('input');
          hiddenIdInput.type = 'hidden';
          hiddenIdInput.name = 'addressId';
          addressForm.closest('form').appendChild(hiddenIdInput);
        }
        hiddenIdInput.value = addressId;

        // Show form and scroll
        addressFormContainer.classList.remove('hidden');
        addressFormContainer.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }


    if (sortDropdown && searchField && categorySelector) {
      sortDropdown.addEventListener("change", async function () {

      const sort = this.value;
      const { sort_by, order } = mapSortToQuery(sort);
      sort_by_global = sort_by;
      order_global = order;
      fetchFilteredProducts();

    });
          

    searchField.addEventListener('input', function (e) {
      filterState.search = e.target.value.trim();
    });

  // Category checkboxes (reuse class .filter-checkbox for categories)
  // categorySelector.forEach(cb => {
  //   cb.addEventListener('change', () => {
  //     const selectedCategories = [];
  //     // const selectedRatings = [];

  //     document.querySelectorAll('.filter-checkbox:checked').forEach(cb => {
  //       if (cb.id.startsWith('cat-')) {
  //       //   selectedRatings.push(cb.id.replace('rating-', '')); // e.g., "5", "4"
  //       // } else if (cb.id.startsWith('cat-')) {
  //         selectedCategories.push(cb.id.replace('cat-', '')); // assume other checkboxes are categories
  //       }
  //     });

  //     filterState.categories = selectedCategories;
  //     // filterState.ratings = selectedRatings;
  //   });
  // });

  categorySelector.forEach(cb => {
  cb.addEventListener('change', () => {
    const selectedCategories = [];

    document.querySelectorAll('.filter-checkbox:checked').forEach(cb => {
      if (cb.id.startsWith('cat-')) {
        selectedCategories.push(cb.id.replace('cat-', ''));
      }
    });

    filterState.categories = selectedCategories;

    // Trigger fetch after state update
    fetchFilteredProducts();
  });
});

  // Price inputs
  minPriceField.addEventListener('input', function (e) {
    filterState.minPrice = e.target.value;
  });

  maxPriceField.addEventListener('input', function (e) {
    filterState.maxPrice = e.target.value;
  });

    // Rating inputs
  minRatingField.addEventListener('input', function (e) {
    filterState.minRating = e.target.value;
  });

  maxRatingField.addEventListener('input', function (e) {
    filterState.maxRating = e.target.value;
  });

  // Search button click
  searchIconButton.closest('button').addEventListener('click', (e) => {
    e.preventDefault();
    fetchFilteredProducts();
  });

  filterButton.addEventListener('click', () => {
    fetchFilteredProducts();
  });
    }





  //order details page functions
  // JavaScript to toggle the saved addresses section visibility
  const showSavedAddressesCheckbox = document.getElementById('show-saved-addresses');
    const savedAddressesSection = document.getElementById('saved-addresses-section');
    
    if (showSavedAddressesCheckbox && savedAddressesSection) {
      // Initial state check
    if (showSavedAddressesCheckbox.checked) {
      savedAddressesSection.classList.remove('hidden');
    } else {
      savedAddressesSection.classList.add('hidden');
    }
    
    // Add event listener for checkbox changes
    showSavedAddressesCheckbox.addEventListener('change', function() {
      if (this.checked) {
        savedAddressesSection.classList.remove('hidden');
      } else {
        savedAddressesSection.classList.add('hidden');
      }
    });
    }






    // script functions for the cart page
    // Get all quantity buttons and inputs
    const decrementButtons = document.querySelectorAll('.quantity-button:first-child');
    const incrementButtons = document.querySelectorAll('.quantity-button:last-child');
    const quantityInputs = document.querySelectorAll('.quantity-input');
    const removeButtons = document.querySelectorAll('.remove-button');
    const applyVoucherButton = document.querySelector('#apply-coupon');
    // const checkoutButton = document.querySelector('#checkout-button');
  
    // Handle quantity decrement
    if (decrementButtons) {
      decrementButtons.forEach((button, index) => {
      button.addEventListener('click', function() {
        let currentValue = parseInt(quantityInputs[index].value);
        if (currentValue > 1) {
          quantityInputs[index].value = (currentValue - 1).toString().padStart(2, '0');
          updateItemSubtotal(index);
          updateServerQuantity(index);
        }
      });

      console.log('Decrement button clicked');
    });
    }
  
    // Handle quantity increment
    if (incrementButtons) {
      incrementButtons.forEach((button, index) => {
      button.addEventListener('click', function() {
        let currentValue = parseInt(quantityInputs[index].value);
        if (currentValue < 99) {
          quantityInputs[index].value = (currentValue + 1).toString().padStart(2, '0');
          updateItemSubtotal(index);
          updateServerQuantity(index);
        }
      });

      console.log('Increment button clicked');
    });
    }
  
    // Handle manual quantity input
    if (quantityInputs) {
      quantityInputs.forEach((input, index) => {
      input.addEventListener('change', function() {
        let value = parseInt(this.value);
        if (isNaN(value) || value < 1) {
          value = 1;
        } else if (value > 99) {
          value = 99;
        }
        this.value = value.toString().padStart(2, '0');
        updateItemSubtotal(index);
      });
    });
    }
  
    // Handle remove item
    if (removeButtons) {
      removeButtons.forEach((button, index) => {
      button.addEventListener('click', function() {
        const cartRow = this.closest('tr');
        cartRow.classList.add('fade-out');
        setTimeout(() => {
          cartRow.remove();
          updateCartTotal();
        }, 300);

        deleteItemFromCart(index);
      });
    });
    }
  
    // Handle apply coupon
    // if (applyVoucherButton) {
    //   applyVoucherButton.addEventListener('click', function(e) {
    //     e.preventDefault();
    //     const couponInput = document.querySelector('#coupon-code');
    //     if (couponInput && couponInput.value.trim()) {
    //       // Simulate coupon application (would be handled by server in real implementation)
    //       const discount = Math.floor(Math.random() * 200) + 50; // Random discount between $50-$250
    //       applyDiscount(discount);
    //       showNotification(`Coupon applied! $${discount} discount.`);
    //       couponInput.value = '';
    //     } else {
    //       showNotification('Please enter a valid coupon code.', true);
    //     }
    //   });
    // }
  
    // Handle checkout
    // if (checkoutButton) {
    //   checkoutButton.addEventListener('click', function(e) {
    //     e.preventDefault();
    //     window.location.href = '/checkout'; // Redirect to checkout page
    //   });
    // }
  

    // Update subtotal for an item
    function updateItemSubtotal(index) {
      const row = quantityInputs[index].closest('tr');
      const priceCell = row.querySelector('td:nth-child(2)');
      const subtotalCell = row.querySelector('td:last-child');

      if (priceCell && subtotalCell) {
        const price = parseFloat(priceCell.textContent.replace('VND', '').replace(/,/g, '').trim());
        const quantity = parseInt(quantityInputs[index].value);
        const subtotal = price * quantity;

        subtotalCell.textContent = `${subtotal.toLocaleString()} VND`;
        updateCartTotal();
      }
    }

    // update quantity of item in db
    function updateServerQuantity(index) {
      const input = quantityInputs[index];
      const row = input.closest('tr');
      const itemId = row.getAttribute('data-product-id');
      const quantity = parseInt(quantityInputs[index].value);


      console.log("DEBUG:", { input, row, itemId, quantity });

      if (!itemId || isNaN(quantity)) return;

      fetch(`/cart-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: itemId,
          quantity: quantity
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('Cart updated:', data);
        } else {
          console.warn('Cart update failed');
        }
      })
      .catch(err => {
        console.error("Failed to update cart:", err);
      });
    }


    // delete item from cart in db
    function deleteItemFromCart(index) {
      const input = quantityInputs[index];
      const row = input.closest('tr');
      const itemId = row.getAttribute('data-product-id');


      console.log("DEBUG:", { input, row, itemId });

      if (!itemId) return;

      fetch(`/cart-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId: itemId,
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('Item deleted:', data);
        } else {
          console.warn('Item deletion from cart, failed');
        }
      })
      .catch(err => {
        console.error("Failed to delete item from cart:", err);
      });
    }

    // Initial calculation
    updateCartTotal();



    // script functions for the products page
    // Filter checkboxes
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox');
    if (filterCheckboxes) {
      filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const label = this.nextElementSibling;
        const checkmark = label.querySelector('span:first-child span');
        
        if (this.checked) {
          checkmark.classList.add('bg-red-500');
          checkmark.classList.remove('bg-white');
        } else {
          checkmark.classList.remove('bg-red-500');
          checkmark.classList.add('bg-white');
        }
      });
    });
  }

    // Category-specific filter (simulation)
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    
    if (category) {
      document.title = `${category.charAt(0).toUpperCase() + category.slice(1)} | L'Ordinateur Très Bien`;
      
      const pageTitle = document.querySelector('h1');
      if (pageTitle) {
        pageTitle.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} Products`;
      }
      
      // Check the appropriate category filter
      const categoryCheckbox = document.getElementById(`cat-${category}`);
      if (categoryCheckbox) {
        categoryCheckbox.checked = true;
        const label = categoryCheckbox.nextElementSibling;
        const checkmark = label.querySelector('span:first-child span');
        checkmark.classList.add('bg-red-500');
        checkmark.classList.remove('bg-white');
      }
    }

    // address chooose for the checkout process
    const chooseAddresses = document.querySelectorAll('.choose-address');
    if (chooseAddresses) {
      chooseAddresses.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();

      // Get data from button
      const fullName = this.dataset.fullname;
      const email = this.dataset.email;
      const address = this.dataset.address;
      const city = this.dataset.city;
      const state = this.dataset.state;
      const zip = this.dataset.zip;

      // Populate form fields
      document.getElementById('fullName').value = fullName;
      document.getElementById('email').value = email;
      document.getElementById('address').value = address;
      document.getElementById('city').value = city;
      document.getElementById('state').value = state;
      document.getElementById('zip').value = zip;
    });
  });
  }


      
});


// Show notification
    function showNotification(message, isError = false) {
      // Remove any existing notification
      const existingNotification = document.querySelector('.notification');
      if (existingNotification) existingNotification.remove();
      
      // Create notification element
      const notification = document.createElement('div');
      notification.classList.add(
        'notification', 
        'fixed', 'top-4', 'right-4', 
        'p-4', 'rounded-md', 
        'shadow-md', 
        'transition-opacity', 'duration-300'
      );
      
      if (isError) {
        notification.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-200');
      } else {
        notification.classList.add('bg-green-100', 'text-green-700', 'border', 'border-green-200');
      }
      
      notification.textContent = message;
      
      // Add to document
      document.body.appendChild(notification);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.classList.add('opacity-0');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }


    // Apply discount to the cart
    // function applyDiscount(amount) {
    //   const cartTotalSection = document.querySelector('.cart-totals');
      
    //   // Remove any existing discount row
    //   const existingDiscount = document.querySelector('.discount-row');
    //   if (existingDiscount) existingDiscount.remove();
      
    //   // Add discount row before the total
    //   const totalRow = document.querySelector('.total-row');
    //   if (totalRow) {
    //     const discountRow = document.createElement('div');
    //     discountRow.classList.add('flex', 'justify-between', 'mb-2', 'discount-row');
    //     discountRow.innerHTML = `
    //       <span>Discount:</span>
    //       <span class="text-red-600" id="discount-amount">-${amount.toLocaleString()} VND</span>
    //     `;
    //     totalRow.parentNode.insertBefore(discountRow, totalRow);
        
    //     // Update total
    //     updateCartTotal();
    //   }
    // }


    // Update cart total
    // Update cart total
function updateCartTotal() {
  const subtotalCells = document.querySelectorAll('tbody tr:not(:last-child) td:last-child');
  let total = 0;

  subtotalCells.forEach(cell => {
    const numericText = cell.textContent.replace('VND', '').replace(/,/g, '').trim();
    total += parseFloat(numericText);
  });

  const subtotalDisplay = document.querySelector('#cart-subtotal');
  const totalDisplay = document.querySelector('#cart-total');

  if (subtotalDisplay) subtotalDisplay.textContent = `${total.toLocaleString()} VND`;
  if (totalDisplay) totalDisplay.textContent = `${total.toLocaleString()} VND`;

  // Check if discount has been applied
  const discountElement = document.querySelector('#discount-amount');
  if (discountElement) {
    const discount = parseFloat(discountElement.textContent.replace(/[^0-9.]/g, '')); // extract number only
    if (totalDisplay) totalDisplay.textContent = `${(total - discount).toLocaleString()} VND`;
  }
}