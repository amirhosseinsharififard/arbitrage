/**
 * GitHub Authentication System
 * بررسی و تایید توکن GitHub قبل از اجرای پروژه
 */

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: './config.env' });

class GitHubAuth {
    constructor() {
        this.token = process.env.GITHUB_TOKEN;
        this.apiBase = 'https://api.github.com';
        this.isAuthenticated = false;
        this.userInfo = null;
    }

    /**
     * بررسی وجود توکن
     */
    hasToken() {
        if (!this.token || this.token === 'your_github_token_here') {
            console.error(chalk.red('❌ GitHub Token not found or not configured!'));
            console.error(chalk.yellow('Please set GITHUB_TOKEN in config.env file'));
            return false;
        }
        return true;
    }

    /**
     * تایید توکن با GitHub API
     */
    async validateToken() {
        try {
            if (!this.hasToken()) {
                return false;
            }

            console.log(chalk.blue('🔐 Validating GitHub token...'));

            const response = await axios.get(`${this.apiBase}/user`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 10000
            });

            if (response.status === 200) {
                this.userInfo = response.data;
                this.isAuthenticated = true;

                console.log(chalk.green('✅ GitHub authentication successful!'));
                console.log(chalk.cyan(`👤 User: ${this.userInfo.login}`));
                console.log(chalk.cyan(`📧 Email: ${this.userInfo.email || 'Not public'}`));
                console.log(chalk.cyan(`🏢 Company: ${this.userInfo.company || 'Not specified'}`));

                return true;
            }

        } catch (error) {
            console.error(chalk.red('❌ GitHub authentication failed!'));

            if (error.response) {
                switch (error.response.status) {
                    case 401:
                        console.error(chalk.red('   Invalid or expired token'));
                        break;
                    case 403:
                        console.error(chalk.red('   Token lacks required permissions'));
                        break;
                    case 404:
                        console.error(chalk.red('   GitHub API endpoint not found'));
                        break;
                    default:
                        console.error(chalk.red(`   HTTP ${error.response.status}: ${error.response.statusText}`));
                }
            } else if (error.code === 'ECONNABORTED') {
                console.error(chalk.red('   Connection timeout - check your internet connection'));
            } else {
                console.error(chalk.red(`   Network error: ${error.message}`));
            }

            // Display developer contact information
            console.error(chalk.yellow('\n📞 Contact developer for technical support:'));
            console.error(chalk.cyan('👤 Amir Sharifi'));
            console.error(chalk.cyan('📱 +98 917 238 4087'));
            console.error(chalk.cyan('💬 Contact developer for technical support\n'));

            return false;
        }
    }

    /**
     * بررسی دسترسی‌های توکن
     */
    async checkTokenPermissions() {
        try {
            if (!this.isAuthenticated) {
                return false;
            }

            console.log(chalk.blue('🔍 Checking token permissions...'));

            // Check repo access
            const repoResponse = await axios.get(`${this.apiBase}/user/repos?per_page=1`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            // Check user permissions
            const userResponse = await axios.get(`${this.apiBase}/user`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            const scopes = userResponse.headers['x-oauth-scopes'];

            console.log(chalk.green('✅ Token permissions verified!'));
            console.log(chalk.cyan(`📋 Scopes: ${scopes || 'No specific scopes'}`));
            console.log(chalk.cyan(`📊 Repositories accessible: ${repoResponse.data.length > 0 ? 'Yes' : 'No'}`));

            return true;

        } catch (error) {
            console.error(chalk.red('❌ Failed to check token permissions!'));
            console.error(chalk.red(`   Error: ${error.message}`));
            return false;
        }
    }

    /**
     * بررسی اتصال به repository
     */
    async checkRepositoryAccess(repoName = 'arbitrage-bot-final') {
        try {
            if (!this.isAuthenticated) {
                return false;
            }

            console.log(chalk.blue(`🔍 Checking access to repository: ${repoName}`));

            const response = await axios.get(`${this.apiBase}/repos/${this.userInfo.login}/${repoName}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 200) {
                console.log(chalk.green(`✅ Repository access confirmed: ${repoName}`));
                console.log(chalk.cyan(`📝 Description: ${response.data.description || 'No description'}`));
                console.log(chalk.cyan(`⭐ Stars: ${response.data.stargazers_count}`));
                console.log(chalk.cyan(`🔀 Forks: ${response.data.forks_count}`));
                return true;
            }

        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log(chalk.yellow(`⚠️ Repository not found: ${repoName}`));
                console.log(chalk.yellow('   You may need to create this repository first'));
            } else {
                console.error(chalk.red(`❌ Failed to access repository: ${repoName}`));
                console.error(chalk.red(`   Error: ${error.message}`));
            }
            return false;
        }
    }

    /**
     * احراز هویت کامل
     */
    async authenticate() {
        console.log(chalk.blue('🚀 Starting GitHub authentication...'));
        console.log(chalk.gray('====================================='));

        // Step 1: Validate token
        const tokenValid = await this.validateToken();
        if (!tokenValid) {
            console.log(chalk.red('\n❌ Authentication failed! Application cannot start.'));
            console.log(chalk.yellow('Please fix the GitHub token and try again.'));
            console.log(chalk.yellow('📞 Contact developer for technical support:'));
            console.log(chalk.cyan('👤 Amir Sharifi'));
            console.log(chalk.cyan('📱 +98 917 238 4087'));
            console.log(chalk.cyan('💬 Contact developer for technical support\n'));
            return false;
        }

        // Step 2: Check permissions
        const permissionsOk = await this.checkTokenPermissions();
        if (!permissionsOk) {
            console.log(chalk.yellow('\n⚠️ Token permissions may be limited.'));
        }

        // Step 3: Check repository access (optional)
        await this.checkRepositoryAccess();

        console.log(chalk.gray('====================================='));
        console.log(chalk.green('🎉 GitHub authentication completed successfully!'));
        console.log(chalk.green('✅ Application is ready to start.\n'));

        return true;
    }

    /**
     * دریافت اطلاعات کاربر
     */
    getUserInfo() {
        return this.userInfo;
    }

    /**
     * بررسی وضعیت احراز هویت
     */
    isAuthValid() {
        return this.isAuthenticated;
    }
}

// Export singleton instance
const githubAuth = new GitHubAuth();
export default githubAuth;