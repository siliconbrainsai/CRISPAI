import torch
import numpy as np

class CausalEngine:
    def __init__(self, device='cpu'):
        self.device = device
        self.models = {}
        
    def _compute_irm_penalty(self, error_e, w):
        """
        Computes the Invariant Risk Minimization (IRM) v1 gradient penalty.
        Ensures penalty is strictly per-environment.
        """
        grad = torch.autograd.grad(outputs=error_e, inputs=w, create_graph=True)[0]
        penalty = grad.pow(2).mean()
        return penalty

    def train_irm(self, env_loaders, dim_x, n_iterations=1000, lr=1e-3, reg=1e-4):
        """
        Train IRM with robust memory management and strict environment partitioning.
        """
        phi = torch.nn.Linear(dim_x, dim_x, bias=False).to(self.device)
        w = torch.ones(dim_x, 1, requires_grad=True, device=self.device)
        opt = torch.optim.Adam(list(phi.parameters()) + [w], lr=lr)
        loss_fn = torch.nn.BCEWithLogitsLoss()

        for iteration in range(n_iterations):
            total_error = 0
            total_penalty = 0
            count = 0
            
            for env_loader in env_loaders:
                env_error = 0
                env_count = 0
                for inputs, targets in env_loader:
                    inputs, targets = inputs.to(self.device), targets.to(self.device)
                    preds = phi(inputs) @ w
                    batch_loss = loss_fn(preds, targets.unsqueeze(1).float())
                    env_error += batch_loss
                    env_count += 1
                    count += 1
                
                # Compute IRM gradient penalty strictly per environment
                total_penalty += self._compute_irm_penalty(env_error, w)
                total_error += env_error
                
            opt.zero_grad()
            # Gradient scaling and backwards
            loss = (reg * total_error / count) + ((1 - reg) * total_penalty / count)
            loss.backward()
            opt.step()
            
            # Explicit cleanup
            torch.cuda.empty_cache()
            
        self.models['IRM'] = {'phi': phi, 'w': w}
        return self.models['IRM']

    def compute_pseudoinverse(self, X):
        """
        Robust pseudoinverse for ICP to prevent numpy.linalg.LinAlgError on rank-deficient/collinear matrices.
        """
        try:
            # Using Tikhonov regularization (Ridge) for numerical stability in singular matrices
            reg_term = 1e-5 * np.eye(X.shape[1])
            inv = np.linalg.pinv(X.T @ X + reg_term) @ X.T
        except np.linalg.LinAlgError:
            print("LinAlgError encountered. Using SVD-based robust pinv fallback.")
            inv = np.linalg.pinv(X, rcond=1e-15)
        return inv
