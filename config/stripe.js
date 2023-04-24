const stripkey = process.env.stripe
const stripe = require('stripe')(stripkey);
const CustomersModel = require('../models/CustomersModel');


module.exports = {

    async createCustomr(customerEmail, customerName) {


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
        return customer
    },
    async createProduct(productName, customerEmail) {

        const product = await stripe.products.create({
            name: productName,
            type: 'good',
            description: 'A description of my product',
            attributes: ['size', 'color'],
        });

        var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { productsId: product.id }, { new: true })
        // console.log("2")
        return product
    },
    async createPrice(productID, productPrice, productCurrency, customerEmail) {

        const price = await stripe.prices.create({
            unit_amount_decimal: productPrice,
            currency: productCurrency,
            recurring: {
                interval: 'month',
                interval_count: 4
            },
            product: productID,
        });

        var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { priceId: price.id }, { new: true })
        // console.log(price.id, "3")
        return price

    },
    async paymentMethod(customerId, paymentMethodType, cardNumber, cardExpMonths, cardExpYear, cardCVC, customerEmail) {

        var paymentMethod = await stripe.paymentMethods.create({
            type: paymentMethodType,
            card: {
                number: cardNumber,
                exp_month: cardExpMonths,
                exp_year: cardExpYear,
                cvc: cardCVC,
            },
        });



        // Attach the PaymentMethod to a Customer
        paymentMethod = await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId });

        var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { paymentMethodId: paymentMethod.id }, { new: true })
        console.log("4")
        return paymentMethod
    },
    async createSubscription(customer, paymentMethod, price, customerEmail,metaData) {



        const subscription = await stripe.subscriptions.create({
            customer: customer,
            items: [{ price: price }],
            default_payment_method: paymentMethod,
            
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                'mobileNumber': metaData.mobileNumber,
                'firstName': metaData.firstName,
                'lastName':metaData.lastName,
                'email':metaData.email,
                'collectionDocId':metaData.fireBaseCollectionDocId

              }
        });

        var update = await CustomersModel.findOneAndUpdate({ email: customerEmail }, { subscriptionsId: subscription.id }, { new: true })
        // console.log("5")
        return subscription

    },

    async subscriptionItemId(customerId, subscriptionId, priceId, customerEmail) {
        var quantity = 1
        const subscriptionItems = await stripe.subscriptionItems.list({ subscription: subscriptionId });
        // Check if a subscription item with the same price ID already exists
        const existingItem = subscriptionItems.data.find(item => item.price.id === priceId);
        if (existingItem) {
            // If an existing subscription item is found, update its quantity
            const updatedItem = await stripe.subscriptionItems.update(existingItem.id, { quantity:1 });
            // Update the subscription item ID in the database
            await CustomersModel.findOneAndUpdate({ email: customerEmail }, { subscriptionItemId: updatedItem.id }, { new: true });
            return updatedItem;
        } else {
            // If no existing subscription item is found, create a new one
            const newItem = await stripe.subscriptionItems.create({
                subscription: subscriptionId,
                price: priceId,
                quantity: 1
            });
            // Update the subscription item ID in the database
            await CustomersModel.findOneAndUpdate({ email: customerEmail }, { subscriptionItemId: newItem.id }, { new: true });
            return newItem
        }

    }






};

