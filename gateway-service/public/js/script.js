function openForgotPasswordPopup() {
    document.getElementById("forgotPasswordPopup").style.display = "flex";
}

function closePopup(tempPopup) {
    document.getElementById(tempPopup).style.display = "none";
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



  document.addEventListener('DOMContentLoaded', function() {
      // Horizontal scrolling for product categories
      const scrollContainers = document.querySelectorAll('.scroll-container');
      
      scrollContainers.forEach(container => {
        let isDown = false;
        let startX;
        let scrollLeft;

        container.addEventListener('mousedown', (e) => {
          isDown = true;
          container.style.cursor = 'grabbing';
          startX = e.pageX - container.offsetLeft;
          scrollLeft = container.scrollLeft;
        });

        container.addEventListener('mouseleave', () => {
          isDown = false;
          container.style.cursor = 'grab';
        });

        container.addEventListener('mouseup', () => {
          isDown = false;
          container.style.cursor = 'grab';
        });

        container.addEventListener('mousemove', (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - container.offsetLeft;
          const walk = (x - startX) * 2; // Scroll speed
          container.scrollLeft = scrollLeft - walk;
        });
      });

      // Add "View" button functionality
      const viewButtons = document.querySelectorAll('.far.fa-eye').forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          const productCard = this.closest('.product-card');
          const productName = productCard.querySelector('h3').textContent;
          window.location.href = `product-details.html?product=${encodeURIComponent(productName)}`;
        });
      });

      // Add "Wishlist" button functionality
      const wishlistButtons = document.querySelectorAll('.far.fa-heart').forEach(button => {
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

      // Responsive navigation for categories
      const categoryLinks = document.querySelectorAll('a[href^="#"]');
      categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          const targetId = this.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            window.scrollTo({
              top: targetElement.offsetTop - 100,
              behavior: 'smooth'
            });
          }
        });
      });
    });



    // script functions for the landing page
    document.addEventListener('DOMContentLoaded', function() {
        // Horizontal scrolling for product categories
        const scrollContainers = document.querySelectorAll('.scroll-container');
        
        scrollContainers.forEach(container => {
          let isDown = false;
          let startX;
          let scrollLeft;
  
          container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
          });
  
          container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
          });
  
          container.addEventListener('mouseup', () => {
            isDown = false;
            container.style.cursor = 'grab';
          });
  
          container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed
            container.scrollLeft = scrollLeft - walk;
          });
        });
  
        // Add "View" button functionality
        const viewButtons = document.querySelectorAll('.far.fa-eye').forEach(button => {
          button.addEventListener('click', function(e) {
            e.preventDefault();
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('h3').textContent;
            window.location.href = `product-details.html?product=${encodeURIComponent(productName)}`;
          });
        });
  
        // Add "Wishlist" button functionality
        const wishlistButtons = document.querySelectorAll('.far.fa-heart').forEach(button => {
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
  
        // Responsive navigation for categories
        const categoryLinks = document.querySelectorAll('a[href^="#"]');
        categoryLinks.forEach(link => {
          link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
              window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
              });
            }
          });
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
  document.addEventListener('DOMContentLoaded', function() {
    // Các biến DOM
    const addAddressBtn = document.getElementById('add-address-btn');
    const addressForm = document.getElementById('address-form');
    const cancelAddressBtn = document.getElementById('cancel-address-btn');
    const saveAddressBtn = document.getElementById('save-address-btn');
    const profileForm = document.getElementById('profile-form');
    const editAddressBtns = document.querySelectorAll('.edit-address');
    const deleteAddressBtns = document.querySelectorAll('.delete-address');
    const makeDefaultBtns = document.querySelectorAll('.make-default');
    
    // Hiển thị form thêm địa chỉ khi click vào nút Add New Address
    addAddressBtn.addEventListener('click', function() {
      addressForm.classList.remove('hidden');
      addressForm.querySelector('h3').textContent = 'Add New Address';
      // Reset form
      addressForm.querySelectorAll('input[type="text"], input[type="tel"]').forEach(input => {
        input.value = '';
      });
      addressForm.querySelector('input[type="checkbox"]').checked = false;
    });
    
    // Đóng form khi click vào Cancel
    cancelAddressBtn.addEventListener('click', function() {
      addressForm.classList.add('hidden');
    });
    
    // Xử lý sự kiện Lưu địa chỉ (giả lập)
    saveAddressBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Ở đây bạn sẽ thêm logic để gửi dữ liệu đến server
      // Vì là phiên bản static nên chúng ta sẽ giả lập việc lưu thành công
      alert('Address saved successfully!');
      addressForm.classList.add('hidden');
    });
    
    // Xử lý sự kiện khi submit form profile
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Ở đây bạn sẽ thêm logic để gửi dữ liệu đến server
      // Vì là phiên bản static nên chúng ta sẽ giả lập việc lưu thành công
      alert('Profile updated successfully!');
    });
    
    // Xử lý sự kiện khi click vào nút chỉnh sửa địa chỉ
    editAddressBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const addressId = this.getAttribute('data-id');
        
        // Trong trường hợp thực tế, bạn sẽ lấy dữ liệu địa chỉ từ server dựa vào addressId
        // Ở đây chúng ta giả lập bằng cách hiển thị form và cập nhật tiêu đề
        addressForm.classList.remove('hidden');
        addressForm.querySelector('h3').textContent = 'Edit Address';
        
        // Cuộn trang đến form
        addressForm.scrollIntoView({ behavior: 'smooth' });
      });
    });
    
    // Xử lý sự kiện khi click vào nút xóa địa chỉ
    deleteAddressBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const addressId = this.getAttribute('data-id');
        
        // Xác nhận xóa
        if(confirm('Are you sure you want to delete this address?')) {
          // Trong trường hợp thực tế, bạn sẽ gửi yêu cầu xóa đến server
          // Ở đây chúng ta giả lập bằng cách hiển thị thông báo
          alert('Address deleted successfully!');
          
          // Có thể thêm logic để loại bỏ phần tử khỏi DOM
          const addressElement = this.closest('.border');
          if(addressElement) {
            addressElement.remove();
          }
        }
      });
    });
    
    // Xử lý sự kiện khi click vào nút đặt làm địa chỉ mặc định
    makeDefaultBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const addressId = this.getAttribute('data-id');
        
        // Trong trường hợp thực tế, bạn sẽ gửi yêu cầu đến server
        // Ở đây chúng ta giả lập bằng cách hiển thị thông báo
        alert('Address set as default successfully!');
        
        // Có thể thêm logic để cập nhật giao diện
        document.querySelectorAll('.bg-gray-50').forEach(el => {
          el.classList.remove('bg-gray-50');
        });
        
        const addressElement = this.closest('.border');
        if(addressElement) {
          addressElement.classList.add('bg-gray-50');
          
          // Thêm badge "Default" nếu chưa có
          if(!addressElement.querySelector('.absolute.top-4.right-4')) {
            const badge = document.createElement('span');
            badge.className = 'absolute top-4 right-4 bg-red-500 text-white text-xs px-2 py-1 rounded-md';
            badge.textContent = 'Default';
            addressElement.appendChild(badge);
          }
          
          // Loại bỏ nút "Make Default" khỏi địa chỉ này
          this.remove();
        }
      });
    });
  });



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
  
    // Handle update cart
    if (updateCartButton) {
      updateCartButton.addEventListener('click', function(e) {
        e.preventDefault();
        updateCartTotal();
        showNotification('Cart updated successfully!');
      });
    }
  
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
  document.addEventListener('DOMContentLoaded', function() {
    const showSavedAddressesCheckbox = document.getElementById('show-saved-addresses');
    const savedAddressesSection = document.getElementById('saved-addresses-section');
    
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
  });