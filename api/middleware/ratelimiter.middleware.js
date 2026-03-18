import express from "express";
import rateLimit from "express-rate-limit";


export var registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 requests per windowMs
    message: "Too many registration attempts from this IP, please try again after an 15 mins",
    standardHeaders: true,
    legacyHeaders: false,
});

export var loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 requests per windowMs
    message: "Too many login attempts from this IP, please try again after an 15 mins",
    standardHeaders: true,
    legacyHeaders: false,
})

export var apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again after an hour",
    standardHeaders: true,
    legacyHeaders: false,
})