const siteMetadata = require('./site-metadata.json')

require("dotenv").config({
    path: `.env.${process.env.NODE_ENV}`,
  })

module.exports = {
    pathPrefix: '/',
    siteMetadata: siteMetadata,
    plugins: [
        `gatsby-plugin-react-helmet`,
        `gatsby-source-data`,
        `gatsby-transformer-remark`,
        {
            resolve: `gatsby-source-filesystem`,
            options: {
                name: `pages`,
                path: `${__dirname}/src/pages`
            }
        },
        {
            resolve: `gatsby-plugin-sass`,
            options: {}
        },
        {
            resolve: `gatsby-remark-page-creator`,
            options: {}
        },
        {
            resolve: `@stackbit/gatsby-plugin-menus`,
            options: {
                sourceUrlPath: `fields.url`,
                pageContextProperty: `menus`,
            }            
        },
        {
            resolve: `gatsby-source-stripe`,
            options: {
              objects: ['Price'],
              secretKey: process.env.GATSBY_STRIPE_SECRET_KEY,
              downloadFiles: false,
            },
          },
    ]
};
