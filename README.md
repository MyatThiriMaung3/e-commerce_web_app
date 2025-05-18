# E-Commerce Web App

**This project is created for the final project of Web Programming with Node.js course at Ton Duc Thang University.**

An e-commerce web application for computers and computer related products only, which provides fully user friendly features (The features are implemented according to the course's final project requirements).

## Features  
- User authentication (Sign up, Login, Logout)
- Product browsing and search functionality
- Add to cart and checkout process 
- Product rating system and commenting system
- Admin dashboard for managing the whole web app
- Analysis on various categories to admin access


## Technologies intended to be used 
- **Language**: Javascript, HTML, CSS
- **Frontend**: Javascript, HTML, CSS, Bootstrap, Tailwind
- **Backend**: Node.js with Express.js
- **Database**: Mongo DB
- **Architecture**: Microservice Architecture, MVC
- **Tools**: Git + GitHub, VScode, Docker

## Project Architecture Details
The architecture of the product will be with 4 totally independent web services, each following MVC structure and its own database. The type of database used will be different for each service, to prove the whole project is able to work on totally different type of databases. There will be another server except for the independent services, which will act as reverse proxy for the project.

## Services for the project
- **Authentication**: User login, registration, JWT handling
- **Product**: Product CRUD, category, variants, reviews
- **Order**: Cart, checkout, order history, loyalty points
- **Gateway**: Frontend page rendering, connected to other services

## Design
The base design is done by [MD Rimel](https://www.figma.com/@mdrimel15). We updated the design of the designer credited, to match the requirements of the project provided by our instructor. The visual presentation of the credited designer still remains.

### View design in Figma
[Full E Commerce Website UI UX Design](https://www.figma.com/community/file/1219312065205187851) - used under [CC VV](https://creativecommons.org/licenses/by/4.0/)

## License
This project is licensed under the MIT license. See [LICENSE](https://github.com/MyatThiriMaung3/e-commerce_web_app/blob/main/LICENSE) for more information.
