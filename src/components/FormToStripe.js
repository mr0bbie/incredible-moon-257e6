import React, { useState } from 'react';
import { navigate } from 'gatsby'
import {CardElement, useStripe, useElements} from '@stripe/react-stripe-js';
import _ from 'lodash';

import {classNames, toStyleObj, withPrefix, markdownify} from '../utils';
import {formatMoney, encodeJson} from '../utils/payment'

const allStyles = {
    smallStyle: {
        lineHeight: "1.4",
        display: "block"
    },
    paymentBox: {
        border: "1px solid transparent",
        borderRadius: "6px",
        background: "rgba(0,0,0,0.04)",
        padding: "8px"
    },
    paymentRow: {
        display: "flex",
        justifyContent: "space-between"
    },
    paymentRowHighlighted: {
        display: "flex",
        justifyContent: "space-between",
        background: "rgba(0, 0, 0, 0.08)",
        fontWeight: "bold",
        marginLeft: "-4px",
        marginRight: "-4px",
        padding: "4px",
        borderRadius: "6px"
    },
    successBox: {
        color: "#155724",
        backgroundColor: "#d4edda",
        borderColor: "#c3e6cb",
        padding: ".75rem 1.25rem",
        marginBottom: "1rem",
        border: "1px solid transparent",
        borderRadius: ".25rem",
        marginTop: "15px"
    },
    errorBox: {
        color: "#721c24",
        backgroundColor: "#f8d7da",
        borderColor: "#f5c6cb",
        padding: ".75rem 1.25rem",
        marginBottom: "1rem",
        border: "1px solid transparent",
        borderRadius: ".25rem",
        marginTop: "15px"
    },
    dropdownSelect: {
        background: "url(/images/common/dropdown-arrow.png) no-repeat right #f7f8f9",
        WebkitAppearance: "none",
        backgroundPositionX: "calc(100% - 16px)"
    }
}

const FormToStripe = (props) => {    
    let section = _.get(props, 'section', null);
    let padding_top = _.get(section, 'padding_top', null) || 'medium';
    let padding_bottom = _.get(section, 'padding_bottom', null) || 'medium';
    let bg_color = _.get(section, 'background_color', null) || 'none';
    let bg_img_opacity_pct = _.get(section, 'background_image_opacity', null) || 100;
    let bg_img_opacity = bg_img_opacity_pct * 0.01;
    let bg_img_size = _.get(section, 'background_image_size', null) || 'cover';
    let bg_img_position = _.get(section, 'background_image_position', null) || 'center center';
    let bg_img_repeat = _.get(section, 'background_image_repeat', null) || 'no-repeat';
    let align_y = _.get(section, 'align_vert', null) || 'top';
    let title_align_x = _.get(section, 'title_align', null) || 'left';
    let content_align_x = _.get(section, 'content_align', null) || 'left';
    let has_text = false;
    let form_layout = _.get(section, 'form_layout', null) || 'stacked';
    let form_width = _.get(section, 'form_width', null) || 'fifty';
    let form_pos = _.get(section, 'form_position', null) || 'bottom';
    let form_is_card = false;
    let is_horiz = false;
    let is_vert = false;
    let form_field_count = 0;
    let form_is_inline = false;
    if (_.get(section, 'content', null)) {
            has_text = true;
    }
    if ((has_text === false)) {
            form_pos = 'bottom';
    }
    if (_.get(section, 'enable_card', null)) {
            form_is_card = true;
    }
    if (((form_pos === 'left') || (form_pos === 'right'))) {
            is_horiz = true;
    }
    if (((form_pos === 'top') || (form_pos === 'bottom'))) {
            is_vert = true;
    }
    if (_.get(section, 'form_fields', null)) {
            form_field_count = _.size(_.get(section, 'form_fields', null));
    }
    if (((form_field_count < 2) && (form_layout === 'inline'))) {
            form_is_inline = true;
    }

    const stripe = useStripe();
    const elements = useElements();
    const [paymentStatus, setPaymentStatus] = useState(0) // 0 = Nothing, 1 = Loading, 2 = Success, 3 = Error
    const [toSubmit, setToSubmit] = useState({
        name: "",
        email: "",
        contact_number: "",
        subject: "",
        event_date: "",
        location: "",
        setup_time: "",
        have_pack_down_time: false,
        pack_down_time: "",
        message: "",
        additional_notes: "",
        consent: false,
        diy_option: false,
        online_payment: false
    })

    const onChangeInput = (name) => (e) => {
        const newToSubmit = {...toSubmit}
        newToSubmit[name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        setToSubmit(newToSubmit)
    }

    const eventDate = new Date(toSubmit.event_date)
    const todayDate = new Date()
    todayDate.setDate(todayDate.getDate() + 14);
    let discount = 0
    if (todayDate < eventDate && !toSubmit.diy_option && toSubmit.online_payment) {
        discount = 0.1
    }
    const messageLetters = toSubmit.message?.replace(/ /g,'')
    const letters = messageLetters ? messageLetters.length : 0
    const letterCost = toSubmit.diy_option ? letters * 100 : (letters <= 3 ? 450 : letters * 150)
    const discounted = letterCost * discount
    const subtotal =  letterCost - discounted
    const gst = subtotal * 0.1

    // const formId = ("Form " + toSubmit.subject).split(" ").join("-")
    const formId = "contact-form"
    const submitForm = async (e) => {
        e.preventDefault()
        setPaymentStatus(1)

        await fetch('/', {
            method: 'POST',
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: encodeJson({
                "form-name": formId,
                ...toSubmit
            })
        })
        
        if (toSubmit.online_payment) {
            if (!stripe || !elements) {
                setPaymentStatus(3)
                return;
            }

            const cardElement = elements.getElement(CardElement);
            const {error, paymentMethod} = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
            });
        
            if (error) {
                setPaymentStatus(3)
                return
            }

            const response = await fetch('/.netlify/functions/payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: toSubmit
                })
            }).then((res) => res.json());

            const charge = await stripe.confirmCardPayment(response.paymentIntent.client_secret, {
                payment_method: paymentMethod.id
            });

            if (charge.error) {
                setPaymentStatus(3)
            } else {
                setPaymentStatus(2)
                setTimeout(() => {
                    navigate("/thank-you")
                }, 1000);
            }
        } else {
            setPaymentStatus(2)
            setTimeout(() => {
                navigate("/thank-you")
            }, 1000);
        }
    }

    return (
        <React.Fragment>
            <section className={classNames('section', {'has-border': _.get(section, 'has_border', null), 'has-cover': _.get(section, 'background_image', null), 'bg-none': bg_color === 'none', 'bg-primary': bg_color === 'primary', 'bg-secondary': bg_color === 'secondary', 'pt-4': padding_top === 'small', 'pt-6': (padding_top === 'medium') || (padding_top === 'large'), 'pt-md-7': padding_top === 'large', 'pb-4': padding_bottom === 'small', 'pb-6': (padding_bottom === 'medium') || (padding_bottom === 'large'), 'pb-md-7': padding_bottom === 'large'})}>
                {_.get(section, 'background_image', null) && (
                <div className="cover-img" style={toStyleObj('background-image: url(\'' + withPrefix(_.get(section, 'background_image', null)) + '\'); opacity: ' + bg_img_opacity + '; background-size: ' + bg_img_size + '; background-repeat: ' + bg_img_repeat + '; background-position: ' + bg_img_position)}/>
                )}
                {(_.get(section, 'title', null) || _.get(section, 'subtitle', null)) && (
                <div className={classNames('container', 'container--medium', 'mb-3', {'text-center': title_align_x === 'center', 'text-right': title_align_x === 'right'})}>
                    {_.get(section, 'subtitle', null) && (
                    <div className="section__subtitle">{_.get(section, 'subtitle', null)}</div>
                    )}
                    {_.get(section, 'title', null) && (
                    <h2 className="section__title mt-0">{_.get(section, 'title', null)}</h2>
                    )}
                </div>
                )}
                <div className={classNames('container', {'container--medium': is_vert})}>
                    <div className={classNames('section__content', 'grid', {'items-center': is_horiz && (align_y === 'middle'), 'items-end': is_horiz && (align_y === 'bottom')})}>
                        {has_text && (
                        <div className={classNames('section__copy', 'my-2', 'cell-12', {'cell-md-7': is_horiz && (form_width === 'fourty'), 'cell-md-6': is_horiz && (form_width === 'fifty'), 'cell-md-5': is_horiz && (form_width === 'sixty'), 'text-center': content_align_x === 'center', 'text-right': content_align_x === 'right'})}>
                            {markdownify(_.get(section, 'content', null))}
                        </div>
                        )}
                        <div className={classNames('section__form', 'my-2', 'cell-12', {'cell-md-5': (is_horiz && has_text) && (form_width === 'fourty'), 'cell-md-6': (is_horiz && has_text) && (form_width === 'fifty'), 'cell-md-7': (is_horiz && has_text) && (form_width === 'sixty'), 'order-first': (form_pos === 'top') || (form_pos === 'left')})}>
                            <form name={formId} id={formId} className={classNames({'form-inline': form_is_inline, 'card': form_is_card, 'p-4': form_is_card, 'p-sm-5': form_is_card})} onSubmit={submitForm} data-netlify="true">
                                <div className={classNames('form-content', {'flex': form_is_inline, 'flex-column': form_is_inline, 'flex-xs-row': form_is_inline})}>
                                    <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                        <label htmlFor="name">Name</label>
                                        <input type="text" id="name" name="name" placeholder="Your name" onChange={onChangeInput("name")} value={toSubmit.name} required />
                                    </div>
                                    <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                        <label htmlFor="email">Email</label>
                                        <input type="email" id="email" name="email" placeholder="Your email" onChange={onChangeInput("email")} value={toSubmit.email} required />
                                    </div>
                                    <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                        <label htmlFor="contact_number">Contact Number</label>
                                        <input type="text" id="contact_number" name="contact_number" placeholder="Your phone number" onChange={onChangeInput("contact_number")} value={toSubmit.contact_number} required />
                                    </div>
                                    <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                        <label htmlFor="subject">Subject</label>
                                        <select name="subject" id="subject" onChange={onChangeInput("subject")} value={toSubmit.subject} style={
                                            allStyles.dropdownSelect
                                        } required>
                                            <option disabled selected value="">Please select</option>
                                            <option value="Partnerships">Partnerships</option>
                                            <option value="General enquiry">General enquiry</option>
                                            <option value="Booking">Booking</option>
                                        </select>
                                    </div>
                                    <div style={toSubmit.subject === "Booking" ? {} : {
                                        display: "none"
                                    }}>
                                        <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                            <label htmlFor="event_date">Event Date</label>
                                            <input type="date" id="event_date" name="event_date" onChange={onChangeInput("event_date")} value={toSubmit.event_date} required={toSubmit.subject === "Booking"} />
                                            <small style={allStyles.smallStyle}>Events more than two weeks in advance have guaranteed availability and 10% discount.</small>
                                        </div>
                                        <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                            <label htmlFor="location">Location</label>
                                            <input type="text" id="location" name="location" placeholder="Your event location" onChange={onChangeInput("location")} value={toSubmit.location} required={toSubmit.subject === "Booking"} />
                                            <small style={allStyles.smallStyle}>Locations outside of Sydney, Brisbane or the Gold Coast may incur additional mobilisation charges.</small>
                                        </div>
                                        <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                            <label htmlFor="setup_time">Setup Time</label>
                                            <input type="time" id="setup_time" name="setup_time" onChange={onChangeInput("setup_time")} value={toSubmit.setup_time} required={toSubmit.subject === "Booking"} />
                                        </div>
                                        <div className="form-checkbox">
                                            <label htmlFor="have_pack_down_time" id="have_pack_down_time-label">
                                                <input name="have_pack_down_time" id="have_pack_down_time" type="checkbox" onChange={onChangeInput("have_pack_down_time")} value={toSubmit.have_pack_down_time} />
                                                <span>Do you know the pack down time?</span>
                                            </label>
                                        </div>
                                        {toSubmit.have_pack_down_time ?
                                        <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                            <label htmlFor="pack_down_time">Pack Down Time</label>
                                            <input type="time" id="pack_down_time" name="pack_down_time" onChange={onChangeInput("pack_down_time")} value={toSubmit.pack_down_time} required={toSubmit.subject === "Booking"} />
                                        </div>
                                        :
                                        <div style={{
                                            height: "8px"
                                        }} />
                                        }
                                        {toSubmit.subject === "Booking" ?
                                        <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                            <label htmlFor="message">Message</label>
                                            <input type="text" id="message" name="message" placeholder="What will you create?" onChange={(e) => {
                                                setToSubmit({
                                                    ...toSubmit,
                                                    message: e.target.value?.toUpperCase()
                                                })
                                            }} value={toSubmit.message} required={toSubmit.subject === "Booking"} />
                                            <small style={allStyles.smallStyle}>Type any combination of letters, numbers or characters.</small>
                                        </div>
                                        : <></>}
                                        <div>
                                            <label>Number of letters</label>
                                            <input type="text" disabled value={letters} style={{
                                                color: "gray",
                                                marginBottom: "15px"
                                            }} />
                                        </div>
                                        <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                            <label htmlFor="additional_notes">Is there anything else we should know?</label>
                                            <textarea rows="4" id="additional_notes" name="additional_notes" onChange={onChangeInput("additional_notes")} value={toSubmit.additional_notes} />
                                            <small style={allStyles.smallStyle}>e.g. venue contacts, prefferred colours, setup location.</small>
                                        </div>
                                        {toSubmit.subject === "Booking" ?
                                        <div className="form-checkbox">
                                            <label htmlFor="consent" id="consent-label">
                                                <input name="consent" id="consent" type="checkbox" onChange={onChangeInput("consent")} value={toSubmit.consent} required />
                                                <span>I understand that this form is storing my submitted information so I can be contacted.</span>
                                            </label>
                                        </div>
                                        : <></>}
                                        <div className="form-checkbox">
                                            <label htmlFor="diy_option" id="diy_option-label">
                                                <input name="diy_option" id="diy_option" type="checkbox" onChange={onChangeInput("diy_option")} value={toSubmit.diy_option} />
                                                <span>Do you want to set up yourself? (DIY option $100 per letter, not applicable for 10% discount)?</span>
                                            </label>
                                        </div>
                                        <div className="form-checkbox">
                                            <label htmlFor="online_payment" id="online_payment-label">
                                                <input name="online_payment" id="online_payment" type="checkbox" onChange={onChangeInput("online_payment")} value={toSubmit.online_payment} />
                                                <span>
                                                    Pay now and save 10% on full hire
                                                    {todayDate < eventDate && !toSubmit.diy_option ?
                                                    " (To get a 10% discount, you need to pay now)"
                                                    : ""}
                                                </span>
                                            </label>
                                        </div>
                                        <div style={{
                                            paddingTop: "10px"
                                        }}>
                                            <h5>Payment</h5>
                                            <div style={allStyles.paymentBox}>
                                                <div style={allStyles.paymentRow}>
                                                    <div>Glow Letters:</div>
                                                    <div>${formatMoney(letterCost)}</div>
                                                </div>
                                                {discounted > 0 ? <div style={allStyles.paymentRow}>
                                                    <div>Discount:</div>
                                                    <div>- ${formatMoney(discounted)}</div>
                                                </div> : <></>}
                                                <div style={allStyles.paymentRowHighlighted}>
                                                    <div>Subtotal:</div>
                                                    <div>${formatMoney(subtotal)}</div>
                                                </div>
                                                <div style={allStyles.paymentRow}>
                                                    <div>GST:</div>
                                                    <div>${formatMoney(gst)}</div>
                                                </div>
                                            </div>
                                            <h5 style={{
                                                marginTop: "10px",
                                                textAlign: "right"
                                            }}>Amount Due: ${formatMoney(subtotal + gst)}</h5>
                                        </div>
                                    </div>
                                    {toSubmit.subject === "Booking" ? <></> :
                                    <>
                                        <div className={classNames('form-group', {'mb-2': form_is_inline === false, 'mb-1': form_is_inline === true, 'mb-xs-0': form_is_inline === true, 'flex-auto': form_is_inline})}>
                                            <label htmlFor="message">Message</label>
                                            <textarea rows="4" id="message" name="message" onChange={onChangeInput("message")} value={toSubmit.message} />
                                        </div>
                                        <div className="form-checkbox">
                                            <label htmlFor="consent" id="consent-label">
                                                <input name="consent" id="consent" type="checkbox" onChange={onChangeInput("consent")} value={toSubmit.consent} required />
                                                <span>I understand that this form is storing my submitted information so I can be contacted.</span>
                                            </label>
                                        </div>
                                    </>
                                    }
                                    {toSubmit.online_payment ?
                                    <div style={allStyles.paymentBox}>
                                        <CardElement
                                            options={{
                                                style: {
                                                    base: {
                                                        fontSize: '16px',
                                                        color: '#424770',
                                                        '::placeholder': {
                                                            color: '#aab7c4',
                                                        },
                                                    },
                                                    invalid: {
                                                        color: '#9e2146',
                                                    },
                                                },
                                            }}
                                        />
                                    </div> : <></>}
                                    {paymentStatus === 2 ?
                                    <div style={allStyles.successBox}>
                                        Form Submitted!
                                    </div>
                                    : paymentStatus === 3 ?
                                    <div style={allStyles.errorBox}>
                                        Error! Please try again later
                                    </div>
                                    : <></>
                                    }
                                    {paymentStatus !== 2 ?
                                    <div className={classNames('form-submit', {'mt-3': form_is_inline === false, 'mx-auto': form_is_inline === true, 'mr-xs-0': form_is_inline === true, 'ml-xs-1': form_is_inline === true})}>
                                        <button type="submit" className="btn btn--primary" disabled={paymentStatus === 1} style={paymentStatus === 1 ? {
                                            opacity: 0.7,
                                            cursor: "unset"
                                        } : {}}>{paymentStatus === 1 ? "Loading..." : _.get(section, 'submit_label', null)}</button>
                                    </div>
                                    : <></>}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </React.Fragment>
    );
}

export default FormToStripe
