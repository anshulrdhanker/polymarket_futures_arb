"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../src/config/database");
function testConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Testing Supabase connection...');
            // Test connection by querying the email_templates table
            const { data, error } = yield database_1.supabase
                .from('email_templates')
                .select('*')
                .limit(5);
            if (error) {
                console.error('❌ Database connection failed:', error.message);
                return;
            }
            console.log('✅ Database connection successful!');
            console.log('Available tables sample:', data);
        }
        catch (error) {
            console.error('❌ Unexpected error:', error);
        }
    });
}
testConnection();
