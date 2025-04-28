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