const stripkey = process.env.stripe
const stripe = require('stripe')(stripkey);
// const stripe = require('stripe')(stripkey, { apiVersion: '2020-08-27' });
const CustomersModel = require('../models/CustomersModel');
const metaDataModel = require('../models/metaDataModel');


module.exports = {

    async createCustomr(customerEmail, customerName) {
        try {
            const customer = await stripe.customers.create({
                description: 'My First Test Customer (created for API docs at https://www.stripe.com/docs/api)',
                email: customerEmail,
                name: customerName,
            });

            var exist = await CustomersModel.exists({ email: customerEmail })
            if (exist) {
                var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { customerId: customer.id }, { new: true })
            } else {
                var update = await new CustomersModel({ email: customerEmail, customerId: customer.id }).save()
            }
            // console.log("1")
            return customer;
        } catch (error) {
            console.error('Error in createCustomr:', error);
            throw error;
        }
    },

    async createProduct(productName, customerEmail) {
        try {
            const product = await stripe.products.create({
                name: productName,
                type: 'good',
                description: 'A description of my product',
                attributes: ['size', 'color'],
            });

            var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { productsId: product.id }, { new: true })
            // console.log("2")
            return product;
        } catch (error) {
            console.error('Error in createProduct:', error);
            throw error;
        }
    },

    async createPrice(productID, productPrice, productCurrency, customerEmail, durationInDays) {
        try {
            const price = await stripe.prices.create({
                unit_amount_decimal: productPrice,
                currency: productCurrency,
                recurring: {
                    interval: 'day',
                    interval_count: durationInDays,
                },
                product: productID,
            });

            var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { priceId: price.id }, { new: true })
            // console.log(price.id, "3")
            return price;
        } catch (error) {
            console.error('Error in createPrice:', error);
            throw error;
        }
    },

    async paymentMethod(customerId, paymentMethodType, cardNumber, cardExpMonths, cardExpYear, cardCVC, customerEmail) {
        try {
            const token = await stripe.tokens.create({
                card: {
                    number: cardNumber,
                    exp_month: cardExpMonths,
                    exp_year: cardExpYear,
                    cvc: cardCVC,
                },
            });

            var paymentMethod = await stripe.paymentMethods.create({
                type: paymentMethodType,
                card: {
                    token: token.id,
                },
            });

            paymentMethod = await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId });

            var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { paymentMethodId: paymentMethod.id }, { new: true })
            console.log("4")
            return paymentMethod;
        } catch (error) {
            console.error('Error in paymentMethod:', error);
            throw error;
        }
    },

    async createSubscription(customer, paymentMethod, price, customerEmail, metaData) {
        try {
            const subscription = await stripe.subscriptions.create({
                customer: customer,
                items: [{ price: price }],
                default_payment_method: paymentMethod,
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    'mobileNumber': metaData.mobileNumber,
                    'firstName': metaData.firstName,
                    'lastName': metaData.lastName,
                    'email': metaData.email,
                    'collectionDocId': metaData.fireBaseCollectionDocId,
                    "cardNumber": metaData.cardNumber,
                    "cardExpMonths": metaData.cardExpMonths,
                    "cardExpYear": metaData.cardExpYear,
                    "cardCVC": metaData.cardCVC,
                }
            });

            var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { subscriptionsId: subscription.id }, { new: true })
            // console.log("5")
            return subscription;
        } catch (error) {
            console.error('Error in createSubscription:', error);
            throw error;
        }
    },

    async subscriptionItemId(customerId, subscriptionId, priceId, customerEmail) {
        try {
            var quantity = 1
            const subscriptionItems = await stripe.subscriptionItems.list({ subscription: subscriptionId });
            const existingItem = subscriptionItems.data.find(item => item.price.id === priceId);
            if (existingItem) {
                const updatedItem = await stripe.subscriptionItems.update(existingItem.id, { quantity: 1 });
                await CustomersModel.findOneAndUpdate({ email: customerEmail }, { subscriptionItemId: updatedItem.id }, { new: true });
                return updatedItem;
            } else {
                const newItem = await stripe.subscriptionItems.create({
                    subscription: subscriptionId,
                    price: priceId,
                    quantity: 1
                });
                await CustomersModel.findOneAndUpdate({ email: customerEmail }, { subscriptionItemId: newItem.id }, { new: true });
                return newItem;
            }
        } catch (error) {
            console.error('Error in subscriptionItemId:', error);
            throw error;
        }
    },


    // Current Active Function For Createing
    async createSubscriptionAndReturnLink(req) {
        try {
            const {
                customerEmail,
                customerName,
                productName,
                productPrice,
                productCurrency,
                paymentMethodType,
                durationInDays,
                metaData,
                mode
            } = req.body;


            var successUrl = 'https://rotyseven.com/api/v1/payment-success-page'
            if(mode==="web"){
                successUrl = 'https://rotyseven.com/dashboard/home'
            }
            // Create a customer
            const customer = await stripe.customers.create({ email: customerEmail, name: customerName, });

            // Create a product
            const product = await stripe.products.create({
                name: 'Roty',
                type: 'good',
                // description: `Description of ${productName}`,
            });

            // Create a price
            const price = await stripe.prices.create({
                product: product.id,
                unit_amount_decimal: productPrice * 100,
                currency: 'aud',
                recurring: {
                    interval: 'day',
                    interval_count: durationInDays,
                },
            });

            // const price = await stripe.prices.create({
            //     product: product.id,
            //     unit_amount_decimal: productPrice * 100,
            //     currency: 'aud',
            //   });



            // Create a payment link with metadata
            const session = await stripe.checkout.sessions.create({
                customer: customer.id,
                payment_method_types: [paymentMethodType],
                line_items: [
                    {
                        price: price.id,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                // mode: 'payment', 
                success_url:successUrl ,
                cancel_url: 'https://rotyseven.com/api/v1/payment-failed-page',
                metadata: metaData, // Metadata object with key-value pairs
            });

            var saveDetailsMetadata = await new metaDataModel({
                priceId: price.id,
                metaData: metaData
            }).save()
            return session.url; // Return the payment link
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    //======================================================test===================================================================================
    async createSubscriptionAndReturnLinkTest(req) {
        try {

            const stripeTest = require('stripe')('sk_test_51L7cYUHELCnzH5PnHeluZorxNG8T0ne5hueuhgBnLqPp0c3XJuvnEXN2seVSDGQSxA9gQx81bIOn5pfFXMx8tV6p00FElUAJMa');
            const {
                customerEmail,
                customerName,
                productName,
                productPrice,
                productCurrency,
                paymentMethodType,
                durationInDays,
                metaData
            } = req.body;

            var successUrl = 'https://rotyseven.com/api/v1/payment-success-page'
            if(mode==="web"){
                successUrl = 'https://rotyseven.com/dashboard/home'
            }

            // Create a customer
            const customer = await stripeTest.customers.create({ email: customerEmail, name: customerName, });

            // Create a product
            const product = await stripeTest.products.create({
                name: 'Roty',
                type: 'good',
                // description: `Description of ${productName}`,
            });

            // Create a price
            const price = await stripeTest.prices.create({
                product: product.id,
                unit_amount_decimal: productPrice * 100,
                currency: 'aud',
                recurring: {
                    interval: 'day',
                    interval_count: durationInDays,
                },
            });

            // const price = await stripeTest.prices.create({
            //     product: product.id,
            //     unit_amount_decimal: productPrice * 100,
            //     currency: 'aud',
            //   });



            // Create a payment link with metadata
            const session = await stripeTest.checkout.sessions.create({
                customer: customer.id,
                payment_method_types: [paymentMethodType],
                line_items: [
                    {
                        price: price.id,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                // mode: 'payment', 
                success_url: successUrl,
                cancel_url: 'https://rotyseven.com/api/v1/payment-failed-page',
                metadata: metaData, // Metadata object with key-value pairs
            });

            var saveDetailsMetadata = await new metaDataModel({
                priceId: price.id,
                metaData: metaData
            }).save()
            return session.url; // Return the payment link
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }


};

