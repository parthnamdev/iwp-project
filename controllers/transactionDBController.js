const { v4: uuidv4 } = require('uuid');
const Consumer = require('../models/consumerModel');
const Product = require('../models/productModel');
const Transaction = require('../models/transactionModel');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const messageGenerate = (name, products, id, addr, type, time, total) => {
    var message = "Hello " + name + ", \nYour last transaction details:\n\nTransaction id :" + id + "\nPayment Type : " + type + "\nAddress : " + addr + "\nOrder Timestamp : " + time + "\n\n\nProduct Details:\n";
    products.forEach(element => {
        message = message + "Product Name: " + element.name + "\nProduct id: " + element.product + "\nQuantity: " + element.quantity + "\nSeller id: " + element.seller + "\n";
    });

    message = message + "\n___________________________________________________________________\n" + "Total : " + total + "\n\nThank you for shopping with us ❤️.\nStore-on-the-go"; 
    return message;
}

// const temp_prod = [{"_id":{"$oid":"618c9cf53f47e33204330096"},"product":"5fa6546c977d9c5758dfc886","quantity":"2","seller":"c0b6b21e-c762-442f-836c-5a76c6f572a9", "name": "OP earbuds"}];
// const pleasework = (req, res) => {
//     // console.log(messageGenerate('john', temp_prod, ));
//     sendMail('dajonar921@nefacility.com', 'john', temp_prod, 'abcde', 'vadodara', 'COD', '28-11-21', 2000);
// }
const sendMail = (to, name, products, id, addr, type, time, total) => {
    const msg = {
        to: to,
        from: 'soham2112@gmail.com',
        subject: 'Transaction successful🎉 - Store-on-the-go',
        text: messageGenerate(name, products, id, addr, type, time, total)
    }

    sgMail.send(msg, (err, info) => {
        if(err) {
            console.log('email not sent');
        } else {
            console.log('email sent to : ' + to);
        }
    })
}

const checkOut = (req, res) => {
    // console.log(req.body);
    const products = req.body.allProducts.split("full");
    const productArray = [];
    products.forEach(element => {
        if(element != '') {
            const splits = element.split("half");
            const temp = {
                product: splits[0],
                quantity: splits[1],
                seller: splits[2],
                name: splits[3]
            }
            Product.findById(splits[0], (er,prod) => {
                prod.quantity = prod.quantity - parseInt(splits[1]);
                prod.save((err) => {
                    if(err) {
                        console(err)
                    } else {
                        
                    }
                })
            })
            productArray.push(temp)
        }
    });
    // console.log(productArray);
    let current = new Date();
    const t_uuid = uuidv4();
    const newTransaction = {
        id: t_uuid,
        consumer: req.user.uuid,
        total: req.body.totalPrice,
        product: productArray,
        address: req.body.addresses,
        payment_type: req.body.payment_option,
        time: current.toLocaleString('en-IN')
    }

    Transaction.create(newTransaction, (err, transaction) => {
        if(!err) {
            Consumer.findOne({uuid: req.user.uuid}, (errr, found) => {
                if(!errr && found) {
                    found.cart = [];
                    const cartClone = found.cart;
                    found.save((er) => {
                        if(!er) {
                            console.log('saved');
                            const temp = req.user;
                            temp.cart = cartClone;
                            res.cookie("user", temp, { signed:true, maxAge: 60*60*1000});
                            res.redirect('/consumer/successTransaction');

                            sendMail(found.email, found.name, productArray,t_uuid, newTransaction.address, newTransaction.payment_type, newTransaction.time, newTransaction.total);
                        } else {
                            console.log(errr);
                            res.render('err', {error: "error in changing quantity"}); 
                        }
                    })
                }
            })
        } else {
            res.render('err', {error: "error in checking out"});
        }
    })
}


const consumerProfilePage = (req, res) => {
    Transaction.find({consumer: req.user.uuid}, (err, found) => {
        if(!err && found) {
                const createAvatar = (fullname) => {
                    var names = fullname.split(' '),
                    initials = names[0].substring(0, 1).toUpperCase();
        
                    if (names.length > 1) {
                    initials += names[names.length - 1].substring(0, 1).toUpperCase();
                    }
                    return initials;
                };
                const avatar = createAvatar(req.user.name);
                
                res.render('consumerProfile',{user: req.user, avatar: avatar, transactions: found});
        } else {
            res.render('err', {error: "error loading profile page"});
        }
    })
}

const sellerTransactions = (req, res) => {
    Transaction.find({}, (err, found) => {
        const sorted = []
        found.forEach(element1 => {
            element1.product.forEach(element => {
                if(element.seller == req.user.uuid) {
                    sorted.push(element1);
                }
            });
        });
        
        res.render('sellerTransactions', {transactions: sorted, user: req.user});
    })
}

module.exports = {
    checkOut, consumerProfilePage, sellerTransactions
}