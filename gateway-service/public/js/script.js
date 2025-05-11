const filterState = {
    search: '',
    categories: [],
    minPrice: '',
    maxPrice: '',
    minRating: '',
    maxRating: '',
  };

  let sort_by_global;
  let order_global;
  let currentPage = 1;
  const itemsPerPage = 2;

function openForgotPasswordPopup() {
    document.getElementById("forgotPasswordPopup").style.display = "flex";
}

function closePopup(tempPopup) {
    document.getElementById(tempPopup).style.display = "none";
}

// dialog show function
function confirmAndSubmit(formId, title, message, icon = 'error') {
  Swal.fire({
          title: title,
          text: message,
          icon: icon,
          showCancelButton: true,
          confirmButtonText: 'Delete',
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
    const input = document.getElementById('quantity');
    if (input.value < 99) {
      input.value = parseInt(input.value) + 1;
    }
  }
  
  function decrementQuantity() {
    const input = document.getElementById('quantity');
    if (input.value > 1) {
      input.value = parseInt(input.value) - 1;
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
    if (categories.includes('all')) {
      categories = [
        'cpu', 'motherboard', 'gpu', 'ram', 'hdd', 'ssd', 'nvme', 'psu',
        'case', 'cooling-air', 'cooling-liquid', 'optical', 'fans',
        'expansion', 'cables', 'thermal', 'bios', 'mounting'
      ];
    }

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


  document.addEventListener('DOMContentLoaded', function() {

    document.getElementById("sortDropdown").addEventListener("change", async function () {
      // try {
      //   const sort = this.value;
      //   const { sort_by, order } = mapSortToQuery(sort);
      //   sort_by_global = sort_by;
      //   order_global = order;

      //   const res = await fetch(`/api/products?sort_by=${sort_by}&order=${order}`);
      //   const data = await res.json();

      //   updateProductsOnPage(data.products);
      // } catch (err) {
      //   console.error("Failed to fetch products:", err);
      // }

      const sort = this.value;
      const { sort_by, order } = mapSortToQuery(sort);
      sort_by_global = sort_by;
      order_global = order;
      fetchFilteredProducts();

    });
          

    document.getElementById('search').addEventListener('input', function (e) {
      filterState.search = e.target.value.trim();
    });

  // Category checkboxes (reuse class .filter-checkbox for categories)
  document.querySelectorAll('.filter-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const selectedCategories = [];
      // const selectedRatings = [];

      document.querySelectorAll('.filter-checkbox:checked').forEach(cb => {
        if (cb.id.startsWith('cat-')) {
        //   selectedRatings.push(cb.id.replace('rating-', '')); // e.g., "5", "4"
        // } else if (cb.id.startsWith('cat-')) {
          selectedCategories.push(cb.id.replace('cat-', '')); // assume other checkboxes are categories
        }
      });

      filterState.categories = selectedCategories;
      // filterState.ratings = selectedRatings;
    });
  });

  // Price inputs
  document.getElementById('min-price').addEventListener('input', function (e) {
    filterState.minPrice = e.target.value;
  });

  document.getElementById('max-price').addEventListener('input', function (e) {
    filterState.maxPrice = e.target.value;
  });

    // Rating inputs
  document.getElementById('min-rating').addEventListener('input', function (e) {
    filterState.minRating = e.target.value;
  });

  document.getElementById('max-rating').addEventListener('input', function (e) {
    filterState.maxRating = e.target.value;
  });

  // Search button click
  document.querySelector('.fa-search').closest('button').addEventListener('click', (e) => {
    e.preventDefault();
    fetchFilteredProducts();
  });

  document.getElementById('btnFilter').addEventListener('click', () => {
    fetchFilteredProducts();
  });

      
  });




// script functions for the products page
document.addEventListener('DOMContentLoaded', function() {
    // Wishlist functionality
    const wishlistButtons = document.querySelectorAll('.far.fa-heart');
    wishlistButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        this.classList.toggle('fas');
        this.classList.toggle('far');
        
        // You could add code here to save to wishlist
        const productCard = this.closest('.product-card');
        const productName = productCard.querySelector('h3').textContent;
        console.log(`${productName} ${this.classList.contains('fas') ? 'added to' : 'removed from'} wishlist`);
      });
    });

    // Price range slider
    const priceRange = document.getElementById('price-range');
    const minPrice = document.getElementById('min-price');
    const maxPrice = document.getElementById('max-price');

    priceRange.addEventListener('input', function() {
      const value = this.value;
      maxPrice.value = value;
    });

    minPrice.addEventListener('input', function() {
      const min = parseInt(this.value) || 0;
      const max = parseInt(maxPrice.value) || 2000;
      
      if (min > max) {
        maxPrice.value = min;
      }
    });

    maxPrice.addEventListener('input', function() {
      const min = parseInt(minPrice.value) || 0;
      const max = parseInt(this.value) || 2000;
      
      if (max < min) {
        minPrice.value = max;
      }

      priceRange.value = max;
    });

    // Filter checkboxes
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox');
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
  });


  // script functions for the account page
  // document.addEventListener('DOMContentLoaded', function() {
  //   // Các biến DOM
  //   const addAddressBtn = document.getElementById('add-address-btn');
  //   const addressForm = document.getElementById('address-form');
  //   const cancelAddressBtn = document.getElementById('cancel-address-btn');
  //   const saveAddressBtn = document.getElementById('save-address-btn');
  //   const profileForm = document.getElementById('profile-form');
  //   const editAddressBtns = document.querySelectorAll('.edit-address');
  //   const deleteAddressBtns = document.querySelectorAll('.delete-address');
  //   const makeDefaultBtns = document.querySelectorAll('.make-default');
    
  //   // Hiển thị form thêm địa chỉ khi click vào nút Add New Address
  //   addAddressBtn.addEventListener('click', function() {
  //     addressForm.classList.remove('hidden');
  //     addressForm.querySelector('h3').textContent = 'Add New Address';
  //     // Reset form
  //     addressForm.querySelectorAll('input[type="text"], input[type="tel"]').forEach(input => {
  //       input.value = '';
  //     });
  //     addressForm.querySelector('input[type="checkbox"]').checked = false;
  //   });
    
  //   // Đóng form khi click vào Cancel
  //   cancelAddressBtn.addEventListener('click', function() {
  //     addressForm.classList.add('hidden');
  //   });
    
  //   // Xử lý sự kiện Lưu địa chỉ (giả lập)
  //   saveAddressBtn.addEventListener('click', function(e) {
  //     e.preventDefault();
      
  //     // Ở đây bạn sẽ thêm logic để gửi dữ liệu đến server
  //     // Vì là phiên bản static nên chúng ta sẽ giả lập việc lưu thành công
  //     alert('Address saved successfully!');
  //     addressForm.classList.add('hidden');
  //   });
    
  //   // Xử lý sự kiện khi submit form profile
  //   profileForm.addEventListener('submit', function(e) {
  //     e.preventDefault();
      
  //     // Ở đây bạn sẽ thêm logic để gửi dữ liệu đến server
  //     // Vì là phiên bản static nên chúng ta sẽ giả lập việc lưu thành công
  //     alert('Profile updated successfully!');
  //   });
    
  //   // Xử lý sự kiện khi click vào nút chỉnh sửa địa chỉ
  //   editAddressBtns.forEach(btn => {
  //     btn.addEventListener('click', function() {
  //       const addressId = this.getAttribute('data-id');
        
  //       // Trong trường hợp thực tế, bạn sẽ lấy dữ liệu địa chỉ từ server dựa vào addressId
  //       // Ở đây chúng ta giả lập bằng cách hiển thị form và cập nhật tiêu đề
  //       addressForm.classList.remove('hidden');
  //       addressForm.querySelector('h3').textContent = 'Edit Address';
        
  //       // Cuộn trang đến form
  //       addressForm.scrollIntoView({ behavior: 'smooth' });
  //     });
  //   });
    
  //   // Xử lý sự kiện khi click vào nút xóa địa chỉ
  //   deleteAddressBtns.forEach(btn => {
  //     btn.addEventListener('click', function() {
  //       const addressId = this.getAttribute('data-id');
        
  //       // Xác nhận xóa
  //       if(confirm('Are you sure you want to delete this address?')) {
  //         // Trong trường hợp thực tế, bạn sẽ gửi yêu cầu xóa đến server
  //         // Ở đây chúng ta giả lập bằng cách hiển thị thông báo
  //         alert('Address deleted successfully!');
          
  //         // Có thể thêm logic để loại bỏ phần tử khỏi DOM
  //         const addressElement = this.closest('.border');
  //         if(addressElement) {
  //           addressElement.remove();
  //         }
  //       }
  //     });
  //   });
    
  //   // Xử lý sự kiện khi click vào nút đặt làm địa chỉ mặc định
  //   makeDefaultBtns.forEach(btn => {
  //     btn.addEventListener('click', function() {
  //       const addressId = this.getAttribute('data-id');
        
  //       // Trong trường hợp thực tế, bạn sẽ gửi yêu cầu đến server
  //       // Ở đây chúng ta giả lập bằng cách hiển thị thông báo
  //       alert('Address set as default successfully!');
        
  //       // Có thể thêm logic để cập nhật giao diện
  //       document.querySelectorAll('.bg-gray-50').forEach(el => {
  //         el.classList.remove('bg-gray-50');
  //       });
        
  //       const addressElement = this.closest('.border');
  //       if(addressElement) {
  //         addressElement.classList.add('bg-gray-50');
          
  //         // Thêm badge "Default" nếu chưa có
  //         if(!addressElement.querySelector('.absolute.top-4.right-4')) {
  //           const badge = document.createElement('span');
  //           badge.className = 'absolute top-4 right-4 bg-red-500 text-white text-xs px-2 py-1 rounded-md';
  //           badge.textContent = 'Default';
  //           addressElement.appendChild(badge);
  //         }
          
  //         // Loại bỏ nút "Make Default" khỏi địa chỉ này
  //         this.remove();
  //       }
  //     });
  //   });
  // });



  // script functions for the cart page
  document.addEventListener('DOMContentLoaded', function() {
    // Get all quantity buttons and inputs
    const decrementButtons = document.querySelectorAll('.quantity-button:first-child');
    const incrementButtons = document.querySelectorAll('.quantity-button:last-child');
    const quantityInputs = document.querySelectorAll('.quantity-input');
    const removeButtons = document.querySelectorAll('.remove-button');
    const updateCartButton = document.querySelector('#update-cart');
    const applyVoucherButton = document.querySelector('#apply-coupon');
    const checkoutButton = document.querySelector('#checkout-button');
  
    // Handle quantity decrement
    decrementButtons.forEach((button, index) => {
      button.addEventListener('click', function() {
        let currentValue = parseInt(quantityInputs[index].value);
        if (currentValue > 1) {
          quantityInputs[index].value = (currentValue - 1).toString().padStart(2, '0');
          updateItemSubtotal(index);
        }
      });
    });
  
    // Handle quantity increment
    incrementButtons.forEach((button, index) => {
      button.addEventListener('click', function() {
        let currentValue = parseInt(quantityInputs[index].value);
        if (currentValue < 99) {
          quantityInputs[index].value = (currentValue + 1).toString().padStart(2, '0');
          updateItemSubtotal(index);
        }
      });
    });
  
    // Handle manual quantity input
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
  
    // Handle remove item
    removeButtons.forEach((button, index) => {
      button.addEventListener('click', function() {
        const cartRow = this.closest('tr');
        cartRow.classList.add('fade-out');
        setTimeout(() => {
          cartRow.remove();
          updateCartTotal();
        }, 300);
      });
    });
  
    // Handle apply coupon
    if (applyVoucherButton) {
      applyVoucherButton.addEventListener('click', function(e) {
        e.preventDefault();
        const couponInput = document.querySelector('#coupon-code');
        if (couponInput && couponInput.value.trim()) {
          // Simulate coupon application (would be handled by server in real implementation)
          const discount = Math.floor(Math.random() * 200) + 50; // Random discount between $50-$250
          applyDiscount(discount);
          showNotification(`Coupon applied! $${discount} discount.`);
          couponInput.value = '';
        } else {
          showNotification('Please enter a valid coupon code.', true);
        }
      });
    }
  
    // Handle checkout
    if (checkoutButton) {
      checkoutButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/checkout'; // Redirect to checkout page
      });
    }
  
    // Update subtotal for an item
    function updateItemSubtotal(index) {
      const row = quantityInputs[index].closest('tr');
      const priceCell = row.querySelector('td:nth-child(2)');
      const subtotalCell = row.querySelector('td:last-child');
      
      if (priceCell && subtotalCell) {
        const price = parseFloat(priceCell.textContent.replace('$', ''));
        const quantity = parseInt(quantityInputs[index].value);
        const subtotal = price * quantity;
        
        subtotalCell.textContent = `$${subtotal}`;
        updateCartTotal();
      }
    }
  
    // Update cart total
    function updateCartTotal() {
      const subtotalCells = document.querySelectorAll('tbody td:last-child');
      let total = 0;
      
      subtotalCells.forEach(cell => {
        total += parseFloat(cell.textContent.replace('$', ''));
      });
      
      const subtotalDisplay = document.querySelector('#cart-subtotal');
      const totalDisplay = document.querySelector('#cart-total');
      
      if (subtotalDisplay) subtotalDisplay.textContent = `$${total}`;
      if (totalDisplay) totalDisplay.textContent = `$${total}`;
      
      // Check if discount has been applied
      const discountElement = document.querySelector('#discount-amount');
      if (discountElement) {
        const discount = parseFloat(discountElement.textContent.replace('$', ''));
        if (totalDisplay) totalDisplay.textContent = `$${total - discount}`;
      }
    }
  
    // Apply discount to the cart
    function applyDiscount(amount) {
      const cartTotalSection = document.querySelector('.cart-totals');
      
      // Remove any existing discount row
      const existingDiscount = document.querySelector('.discount-row');
      if (existingDiscount) existingDiscount.remove();
      
      // Add discount row before the total
      const totalRow = document.querySelector('.total-row');
      if (totalRow) {
        const discountRow = document.createElement('div');
        discountRow.classList.add('flex', 'justify-between', 'mb-2', 'discount-row');
        discountRow.innerHTML = `
          <span>Discount:</span>
          <span class="text-green-600" id="discount-amount">$${amount}</span>
        `;
        totalRow.parentNode.insertBefore(discountRow, totalRow);
        
        // Update total
        updateCartTotal();
      }
    }
  
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
  
    // Initial calculation
    updateCartTotal();
  });


  // script functions for the order details page
  // JavaScript to toggle the saved addresses section visibility
  // document.addEventListener('DOMContentLoaded', function() {
  //   const showSavedAddressesCheckbox = document.getElementById('show-saved-addresses');
  //   const savedAddressesSection = document.getElementById('saved-addresses-section');
    
  //   // Initial state check
  //   if (showSavedAddressesCheckbox.checked) {
  //     savedAddressesSection.classList.remove('hidden');
  //   } else {
  //     savedAddressesSection.classList.add('hidden');
  //   }
    
  //   // Add event listener for checkbox changes
  //   showSavedAddressesCheckbox.addEventListener('change', function() {
  //     if (this.checked) {
  //       savedAddressesSection.classList.remove('hidden');
  //     } else {
  //       savedAddressesSection.classList.add('hidden');
  //     }
  //   });
  // });