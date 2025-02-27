import { NextFunction, Request, Response } from 'express';
import { body, validationResult, param, ExpressValidator } from 'express-validator';

import UserRepository from '../db/repository/UserRepository';
import WishCardRepository from '../db/repository/WishCardRepository';
import log from '../helper/logger';
import Utils from '../helper/utils';

const amazonLinkValidator = new ExpressValidator({
	isValidLink: (value: string) => {
		//eventually add these to global constants (it's used by FE already in react/utils/constants)
		const amazonUrlRegex = /^(https?(:\/\/)){1}([w]{3})(\.amazon\.com){1}\/.*$/;
		const amazonProductRegex = /\/dp\/([A-Z0-9]{10})/;
		return (
			typeof value === 'string' &&
			amazonUrlRegex.test(value) &&
			amazonProductRegex.test(value)
		);
	},
});

export default class Validations {
	static validate(req: Request, res: Response, next: NextFunction) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const [error] = errors.array({ onlyFirstError: true });

			log.error(`[Validations] ${error.msg}`);

			return res.status(400).send({ error });
		}

		return next();
	}

	static signupValidationRules() {
		return [
			body('fName', 'First name is required!').notEmpty().isString(),
			body('lName', 'Last name is required!').notEmpty().isString(),
			body('email', 'Email is required!')
				.notEmpty()
				.isString()
				.isEmail()
				.withMessage('Please provide a proper email address')
				.trim(),
			body('password')
				.notEmpty()
				.isString()
				.isLength({ min: 8 })
				.withMessage('must be at least 8 characters long')
				.matches(/^(?=.*\d.*)(?=.*[a-z].*)(?=.*[A-Z].*).{8,}$/)
				.withMessage('Password must contain a number, one lower and one uppercase letter'),
			body('passwordConfirm').custom((value, { req }) => {
				if (value !== req.body.password) {
					throw new Error('Password confirmation does not match password');
				}
				return true;
			}),
			body('userRole', 'A role is required!').notEmpty().isString(),
		];
	}

	static googlesignupValidationRules() {
		return [body('id_token').exists()];
	}

	static fbsignupValidationRules() {
		return [body('userName').exists(), body('email').exists().isEmail()];
	}

	static updateProfileValidationRules() {
		return [body('aboutMe', 'About me text is required!').trim()];
	}

	static updateAccountDetailsRules() {
		return [
			body('fName', 'First name is required!').trim().isLength({ min: 1 }).isString(),
			body('lName', 'Last name is required!').trim().isLength({ min: 1 }).isString(),
		];
	}

	private static readonly AGENCY_PHONE_NUMBER_REGEX =
		/^(\([2-9][0-9]{2}\)[-\s]|[2-9][0-9]{2}[-\s])?[0-9]{3}[-\s]?[0-9]{4}$/;

	static updateAgencyDetailsRules() {
		return [
			body('agencyBio').optional(),
			body('agencyWebsite')
				.trim()
				.isURL()
				.withMessage('Agency website must be a valid URL')
				.optional({ values: 'falsy' }),
			body('agencyPhone')
				.trim()
				.notEmpty()
				.withMessage('Agency phone number is required')
				.isLength({ min: 7 })
				.withMessage('Phone number must be at least 7 characters long')
				.matches(Validations.AGENCY_PHONE_NUMBER_REGEX)
				.withMessage('Phone number must match format XXX-XXX-XXXX'),
			body('address1')
				.trim()
				.notEmpty()
				.withMessage('Agency primary address is required!')
				.isLength({ min: 5 })
				.withMessage('Address must contain at least 5 characters'),
			body('address2').optional(),
			body('city', 'City is required')
				.trim()
				.isLength({ min: 2 })
				.withMessage('City must contain at least 2 characters'),
			body('state', 'State is required!')
				.trim()
				.isLength({ min: 2 })
				.withMessage('State must contain at least 2 characters'),
			body('country', 'Country is required')
				.trim()
				.isLength({ min: 2 })
				.withMessage('Country must contain at least 2 characters'),
			body('zipcode', 'zipcode is required!')
				.trim()
				.isLength({ min: 5 })
				.withMessage('Zipcode must contain at least 5 characters'),
		];
	}

	static createAgencyValidationRules() {
		return [
			body('agencyName').notEmpty().isString().withMessage('Agency name is required!'),
			body('agencyWebsite').optional(),
			body('agencyAddress.address1')
				.notEmpty()
				.isLength({ min: 5 })
				.withMessage('Address must contain at least 5 characters'),
			body('agencyAddress.address2').optional(),
			body('agencyAddress.city')
				.notEmpty()
				.isLength({ min: 2 })
				.withMessage('City must contain at least 2 characters'),
			body('agencyAddress.state')
				.notEmpty()
				.isLength({ min: 2 })
				.withMessage('State must contain at least 2 characters'),
			body('agencyAddress.country')
				.notEmpty()
				.isLength({ min: 2 })
				.withMessage('Country must contain at least 2 characters'),
			body('agencyAddress.zipcode')
				.notEmpty()
				.isLength({ min: 5 })
				.withMessage('Zipcode must contain at least 5 characters'),
			body('agencyPhone')
				.notEmpty()
				.isLength({ min: 7 })
				.withMessage('Phone number must be at least 7 characters long')
				.matches(Validations.AGENCY_PHONE_NUMBER_REGEX)
				.withMessage('Phone number must match format XXX-XXX-XXXX'),
			body('agencyBio').optional(),
		];
	}

	static loginValidationRules() {
		return [
			body('email', 'Email is required!')
				.notEmpty()
				.isString()
				.isEmail()
				.withMessage('Please provide an email address')
				.trim(),
			body('password').notEmpty().isString(),
		];
	}

	static verifyHashValidationRules() {
		return [param('hash').exists()];
	}

	static passwordRequestValidationRules() {
		return [body('email').notEmpty().isEmail()];
	}

	static getPasswordResetValidationRules() {
		return [param('token').exists()];
	}

	static postPasswordResetValidationRules() {
		return [
			body('token').notEmpty().isString(),
			body('password').notEmpty().isString().trim(),
			body('passwordConfirm')
				.notEmpty()
				.isString()
				.isLength({ min: 8 })
				.withMessage('Password must be at least 8 characters long')
				.matches(/^(?=.*\d.*)(?=.*[a-z].*)(?=.*[A-Z].*).{8,}$/)
				.withMessage('Password must contain a number, one lower and one uppercase letter'),
		];
	}

	//TODO: we need to pull all error messages from translations.js in the future
	static createWishcardValidationRules() {
		return [
			body('childFirstName')
				.notEmpty()
				.withMessage("Child's first name is required")
				.isString(),
			body('childInterest').notEmpty().withMessage('Child interest is required.').isString(),
			body('childBirthYear').notEmpty().withMessage('Child birth year is required.'),
			body('wishItemName').notEmpty().withMessage('Wish item name is required').isString(),
			body('wishItemPrice').notEmpty().withMessage('Wish item price is required').isNumeric(),
			amazonLinkValidator
				.body('wishItemURL')
				.isValidLink()
				.withMessage(
					'Item URL must start with https://www.amazon.com/ and contain a product ID to be valid.',
				),
			body('childStory').notEmpty().withMessage("Child's story is required").isString(),
			body('address1')
				.notEmpty()
				.withMessage('Address cannot be empty')
				.isLength({ min: 5 })
				.withMessage('Address must contain at least 5 characters'),
			body('address2').optional(),
			body('city')
				.notEmpty()
				.withMessage('City cannot be empty')
				.isLength({ min: 2 })
				.withMessage('City must contain at least 2 characters'),
			body('state')
				.notEmpty()
				.withMessage('State cannot be empty')
				.isLength({ min: 2 })
				.withMessage('State must contain at least 2 characters'),
			body('country')
				.notEmpty()
				.withMessage('Country cannot be empty')
				.isLength({ min: 2 })
				.withMessage('Country must contain at least 2 characters'),
			body('zipcode')
				.notEmpty()
				.withMessage('Zipcode cannot be empty')
				.isLength({ min: 5 })
				.withMessage('Zipcode must contain at least 5 characters'),
		];
	}

	static createGuidedWishcardValidationRules() {
		return [
			body('itemChoice')
				.isJSON()
				.withMessage('Must select an option')
				.custom((itemChoice) => {
					const item = JSON.parse(itemChoice);
					const { Name, Price, ItemURL } = item;
					if (!Name || !Price || !ItemURL) {
						throw new Error('Missing items');
					} else if (typeof Name !== 'string') {
						throw new TypeError('ItemChoice Name - Wrong fieldtype');
					} else if (typeof Price !== 'number') {
						throw new TypeError('ItemChoice Price - Wrong fieldtype');
					} else if (typeof ItemURL !== 'string') {
						throw new TypeError('ItemChoice String - Wrong fieldtype');
					}
					return true;
				}),
			body('childBirthday').isString(),
			body('childFirstName')
				.notEmpty()
				.withMessage("Child's first name is required")
				.isString(),
			body('childLastName').isString(),
			body('childInterest').isString(),
			body('childStory').notEmpty().withMessage("Child's story is required").isString(),
			body('address1')
				.notEmpty()
				.withMessage('Address cannot be empty')
				.isLength({ min: 5 })
				.withMessage('Address must contain at least 5 characters'),
			body('address2').optional(),
			body('address_city')
				.notEmpty()
				.withMessage('City cannot be empty')
				.isLength({ min: 2 })
				.withMessage('City must contain at least 2 characters'),
			body('address_state')
				.notEmpty()
				.withMessage('State cannot be empty')
				.isLength({ min: 2 })
				.withMessage('State must contain at least 2 characters'),
			body('address_country')
				.notEmpty()
				.withMessage('Country cannot be empty')
				.isLength({ min: 2 })
				.withMessage('Country must contain at least 2 characters'),
			body('address_zip')
				.notEmpty()
				.withMessage('Zip cannot be empty')
				.isLength({ min: 5 })
				.withMessage('Zipcode must contain at least 5 characters'),
		];
	}

	static searchValidationRules() {
		return [body('wishitem').notEmpty().withMessage('Wishitem is required')];
	}

	static getByIdValidationRules() {
		return [param('id').notEmpty().withMessage('Id parameter is required')];
	}

	static updateWishCardValidationRules() {
		return [param('id').notEmpty().withMessage('Id parameter is required')];
	}

	static updateAgencyWishcardValidationRules() {
		return [
			body('childFirstName')
				.notEmpty()
				.withMessage("Child's first name is required")
				.isLength({ max: 255 })
				.withMessage("Child's first name is no longer than 255 characters"),

			body('wishItemName')
				.notEmpty()
				.withMessage('Wish item name is required')
				.isLength({ max: 255 })
				.withMessage('Wish item name is no longer than 255 characters'),

			// decimal(10, 2)
			body('wishItemPrice')
				.notEmpty()
				.withMessage('Wish item price is required')
				.isFloat({
					min: 0.01,
					max: 40,
				})
				.withMessage(
					'Wish item price must be a valid number, must be at least $0.01 and must not exceed $40',
				)
				.isDecimal({ decimal_digits: '0,2', locale: 'en-US' })
				.toFloat()
				.withMessage(
					'Wish item price cannot have more than 2 decimal places',
					// 'Wish item price must be a valid 2 decimal places numeric value ($0.01 ≤ price ≤ $40.00)',
				),

			body('childInterest')
				.notEmpty()
				.withMessage("Child's interest is required")
				.isLength({ max: 255 })
				.withMessage("Child's interest is no longer than 255 characters"),

			body('childStory')
				.notEmpty()
				.withMessage("Child's story is required")
				.isLength({ max: 2000 })
				.withMessage("Child's story is no longer than 2000 characters"),
		];
	}

	static postMessageValidationRules() {
		return [
			body('messageFrom')
				.notEmpty()
				.withMessage('Message From - User is required')
				.custom(async (value) => {
					const foundUser = await new UserRepository().getUserByObjectId(value._id);
					if (!foundUser) {
						throw new Error('User Error - User not found');
					}
					return true;
				}),
			body('messageTo')
				.notEmpty()
				.withMessage('Message To - Wishcard is required')
				.custom(async (value) => {
					const foundWishcard = await new WishCardRepository().getWishCardByObjectId(
						value._id,
					);
					if (!foundWishcard) {
						throw new Error('Wishcard Error - Wishcard not found');
					}
				}),
			body('message')
				.notEmpty()
				.withMessage('Message is required')
				.custom((value, { req }) => {
					const { messageFrom: user, messageTo: wishcard } = req.body;
					const allMessages = Utils.getMessageChoices(
						user.fName,
						wishcard.childFirstName,
					);
					if (!allMessages.includes(value)) {
						throw new Error('Message Error - Message Choice not found');
					}
					return true;
				}),
		];
	}

	static getDefaultCardsValidationRules() {
		return [param('id').notEmpty().withMessage('Id parameter is required')];
	}

	static donationPostValidation() {
		return [
			body('postText')
				.notEmpty()
				.withMessage('Message can not be empty')
				.isLength({ min: 30 })
				.withMessage('Message must contain at least 30 characters'),
		];
	}
}
