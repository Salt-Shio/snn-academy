import numpy as np
import matplotlib.pyplot as plt
from brian2 import *

def default_pars(**kwargs):
    """
    Initializes a dictionary with default simulation parameters.
    """
    pars = {}

    ### typical neuron parameters###
    pars['V_th'] = -55.     # spike threshold [mV]
    pars['V_reset'] = -75.  # reset potential [mV]
    pars['tau_m'] = 10.     # membrane time constant [ms]
    pars['g_L'] = 10.       # leak conductance [nS]
    pars['V_init'] = -75.   # initial potential [mV]
    pars['V_L'] = -75.      # leak reversal potential [mV]
    pars['tref'] = 2.       # refractory time (ms)

    ### simulation parameters ###
    pars['T'] = 400.        # Total duration of simulation [ms]
    pars['dt'] = .1         # Simulation time step [ms]

    ### external parameters if any ###
    for k, v in kwargs.items():
        pars[k] = v

    pars['range_t'] = np.arange(0, pars['T'], pars['dt'])
    return pars

def my_CC(i, j):
    """
    Calculates the sample correlation coefficient between two sequences.
    """
    if len(i) == 0 or len(j) == 0:
        return 0.0
    cov = np.cov(i, j)[0, 1]
    var_i = np.var(i, ddof=1)
    var_j = np.var(j, ddof=1)

    if var_i > 0 and var_j > 0:
        rij = cov / np.sqrt(var_i * var_j)
    else:
        rij = 0.0
    return rij

def my_GWN(pars, sig, n=1, myseed=False):
    """
    Generates Gaussian white noise inputs.
    
    Args:
        pars: Parameter dictionary.
        sig: Noise amplitude.
        n: Number of noise sequences to generate (default 1).
        myseed: Random seed.
    """
    dt, range_t = pars['dt'], pars['range_t']
    Lt = range_t.size

    if myseed is not False:
        np.random.seed(seed=myseed)
    else:
        np.random.seed()

    if n > 1:
        I_GWN = sig * np.random.randn(n, Lt) * np.sqrt(pars['tau_m'] / dt)
    else:
        I_GWN = sig * np.random.randn(Lt) * np.sqrt(pars['tau_m'] / dt)
    return I_GWN

def correlate_input(pars, mu=20., sig=7.5, c=0.3, n=1):
    """
    Generates two correlated Gaussian white noise inputs.
    
    Args:
        pars: Parameter dictionary.
        mu: Mean input current.
        sig: Noise standard deviation.
        c: Correlation coefficient.
        n: Number of pairs to generate (default 1).
    """
    xi_1 = my_GWN(pars, sig, n=n)
    xi_2 = my_GWN(pars, sig, n=n)
    xi_c = my_GWN(pars, sig, n=n)

    I1gL = mu + np.sqrt(1. - c) * xi_1 + np.sqrt(c) * xi_c
    I2gL = mu + np.sqrt(1. - c) * xi_2 + np.sqrt(c) * xi_c

    return I1gL, I2gL

def run_LIF(pars, Iinj):
    """
    Simulates one or more LIF neurons using Brian2.
    
    Args:
        pars: Parameter dictionary.
        Iinj: Input current. Can be a scalar, 1D array (single neuron), or 2D array (multi-neuron).
    """
    V_th = pars['V_th'] * mV
    V_reset = pars['V_reset'] * mV
    tau_m = pars['tau_m'] * ms
    g_L = pars['g_L'] * nS
    V_init = pars['V_init'] * mV
    V_L = pars['V_L'] * mV
    dt = pars['dt'] * ms
    tref = pars['tref'] * ms
    
    defaultclock.dt = dt
    
    if np.isscalar(Iinj):
        n_neurons = 1
        Iinj_values = np.ones(pars['range_t'].size) * Iinj * pA
        I_func = TimedArray(Iinj_values, dt=dt)
        eqs = '''
        dv/dt = (-(v - V_L) + I/g_L) / tau_m : volt (unless refractory)
        I = I_func(t) : amp
        '''
    elif Iinj.ndim == 1:
        n_neurons = 1
        Iinj_values = Iinj * pA
        I_func = TimedArray(Iinj_values, dt=dt)
        eqs = '''
        dv/dt = (-(v - V_L) + I/g_L) / tau_m : volt (unless refractory)
        I = I_func(t) : amp
        '''
    else:
        # Multi-neuron case
        n_neurons = Iinj.shape[0]
        Iinj_values = Iinj.T * pA  # shape (time, neurons)
        I_func = TimedArray(Iinj_values, dt=dt)
        eqs = '''
        dv/dt = (-(v - V_L) + I/g_L) / tau_m : volt (unless refractory)
        I = I_func(t, i) : amp
        '''
    
    G = NeuronGroup(n_neurons, 
                    model=eqs, 
                    threshold='v > V_th', 
                    reset='v = V_reset', 
                    refractory=tref, 
                    method='exact')
    G.v = V_init
    
    state_mon = StateMonitor(G, 'v', record=True)
    spike_mon = SpikeMonitor(G)
    
    duration = pars['range_t'].size * dt
    run(duration)
    
    # Extract results
    if n_neurons == 1:
        rec_v = np.array(state_mon.v[0] / mV)
        rec_spikes = np.array(spike_mon.t / ms)
        
        Lt = pars['range_t'].size
        if len(rec_v) > Lt:
            rec_v = rec_v[:Lt]
        elif len(rec_v) < Lt:
            rec_v = np.pad(rec_v, (0, Lt - len(rec_v)), 'edge')
    else:
        # For multiple neurons, return lists or arrays
        rec_v = np.array(state_mon.v / mV) # shape (n_neurons, Lt)
        rec_spikes = [np.array(spike_mon.t[spike_mon.i == i] / ms) for i in range(n_neurons)]
        
    return rec_v, rec_spikes

def LIF_output_cc(pars, mu, sig, c, bin_size, n_trials=20):
    """
    Simulates multiple trials of two LIF neurons with correlated input and computes output correlation.
    Uses vectorized simulation for speed optimization.
    """
    # Generate all inputs at once
    I1_all, I2_all = correlate_input(pars, mu, sig, c, n=n_trials)
    
    # Combine all neurons into one simulation (n_trials * 2 neurons)
    I_combined = np.vstack([I1_all, I2_all])
    
    # Run simulation once
    _, rec_spikes_all = run_LIF(pars, pars['g_L'] * I_combined)
    
    r12 = np.zeros(n_trials)
    sp_rate = np.zeros(n_trials)
    my_bin = np.arange(0, pars['T'], bin_size)
    
    for i in range(n_trials):
        sp1 = rec_spikes_all[i]
        sp2 = rec_spikes_all[i + n_trials]
        
        sp1_count, _ = np.histogram(sp1, bins=my_bin)
        sp2_count, _ = np.histogram(sp2, bins=my_bin)
        
        r12[i] = my_CC(sp1_count[::20], sp2_count[::20])
        sp_rate[i] = len(sp1) / pars['T'] * 1000.
        
    return r12.mean(), sp_rate.mean(), rec_spikes_all[n_trials-1], rec_spikes_all[2*n_trials-1]

def plot_c_r_LIF(c, r, mycolor, mylabel):
    """
    Plots the input correlation vs. output correlation for LIF neurons.
    """
    z = np.polyfit(c, r, deg=1)
    c_range = np.array([c.min() - 0.05, c.max() + 0.05])
    plt.plot(c, r, 'o', color=mycolor, alpha=0.7, label=mylabel, zorder=2)
    plt.plot(c_range, z[0] * c_range + z[1], color=mycolor, zorder=1)

def get_spike_counts(spike_times, sim_time_ms, bin_size_ms):
    """
    Bins the spike times into counts.
    """
    bins = np.arange(0, sim_time_ms + bin_size_ms, bin_size_ms)
    counts, _ = np.histogram(spike_times, bins=bins)
    return counts

def Poisson_generator(pars, rate, n, myseed=False):
    """
    Generates Poisson spike trains.
    """
    dt, range_t = pars['dt'], pars['range_t']
    Lt = range_t.size

    if myseed is not False:
        np.random.seed(seed=myseed)
    else:
        np.random.seed()

    u_rand = np.random.rand(n, Lt)
    poisson_train = 1. * (u_rand < rate * (dt / 1000.))
    return poisson_train

def my_raster_Poisson(range_t, spike_train, n):
    """
    Plots the raster of the Poisson spike trains.
    """
    N = spike_train.shape[0]
    if n > N:
        n = N

    plt.figure()
    i = 0
    while i < n:
        if spike_train[i, :].sum() > 0.:
            t_sp = range_t[spike_train[i, :] > 0.5]
            plt.plot(t_sp, i * np.ones(len(t_sp)), 'k|', ms=10, markeredgewidth=2)
        i += 1
    plt.xlim([range_t[0], range_t[-1]])
    plt.ylim([-0.5, n + 0.5])
    plt.xlabel('Time (ms)', fontsize=12)
    plt.ylabel('Neuron ID', fontsize=12)
    plt.show()

def generate_corr_Poisson(pars, poi_rate, c, myseed=False):
    """
    Generates correlated Poisson spike trains.
    """
    range_t = pars['range_t']
    mother_rate = poi_rate / c
    mother_spike_train = Poisson_generator(pars, rate=mother_rate, n=1, myseed=myseed)[0]
    sp_mother = range_t[mother_spike_train > 0]

    L_sp_mother = len(sp_mother)
    sp_mother_id = np.arange(L_sp_mother)
    L_sp_corr = int(L_sp_mother * c)

    np.random.shuffle(sp_mother_id)
    sp1 = np.sort(sp_mother[sp_mother_id[:L_sp_corr]])

    np.random.shuffle(sp_mother_id)
    sp2 = np.sort(sp_mother[sp_mother_id[:L_sp_corr]])

    return sp1, sp2

def corr_coeff_pairs(pars, rate, c, trials, bins):
    """
    Calculates the correlation coefficient of two spike trains for multiple trials.
    """
    r12 = np.zeros(trials)
    for i in range(trials):
        sp1, sp2 = generate_corr_Poisson(pars, rate, c, myseed=2020+i)
        sp1_count, _ = np.histogram(sp1, bins=bins)
        sp2_count, _ = np.histogram(sp2, bins=bins)
        r12[i] = my_CC(sp1_count, sp2_count)
    return r12


# =============================================================================
# Conductance-based LIF with Brian2
# =============================================================================

def run_LIF_cond(pars, I_inj, pre_spike_train_ex, pre_spike_train_in):
    """
    Conductance-based LIF dynamics using Brian2.
    
    Args:
        pars               : parameter dictionary
        I_inj              : injected current [pA]
        pre_spike_train_ex : spike train from excitatory presynaptic neurons (n_ex x Lt)
        pre_spike_train_in : spike train from inhibitory presynaptic neurons (n_in x Lt)
    
    Returns:
        v          : membrane potential [mV]
        rec_spikes : spike times [ms]
        gE         : excitatory conductance [nS]
        gI         : inhibitory conductance [nS]
    """
    # Clear previous Brian2 objects
    start_scope()
    
    # Retrieve parameters
    V_th = pars['V_th'] * mV
    V_reset = pars['V_reset'] * mV
    tau_m = pars['tau_m'] * ms
    g_L = pars['g_L'] * nS
    V_init = pars['V_init'] * mV
    E_L = pars['E_L'] * mV
    gE_bar = pars['gE_bar'] * nS
    gI_bar = pars['gI_bar'] * nS
    VE = pars['VE'] * mV
    VI = pars['VI'] * mV
    tau_syn_E = pars['tau_syn_E'] * ms
    tau_syn_I = pars['tau_syn_I'] * ms
    tref = pars['tref'] * ms
    dt_sim = pars['dt'] * ms
    range_t = pars['range_t']
    Lt = len(range_t)
    
    defaultclock.dt = dt_sim
    
    # Compute total presynaptic spike counts at each time step
    if pre_spike_train_ex.max() == 0:
        pre_spike_ex_total = np.zeros(Lt)
    else:
        pre_spike_ex_total = pre_spike_train_ex.sum(axis=0)
        # [0, 0, 2, 0, 0, 5, 0, 3] 表示某時間有幾個輸入神經元 spike
    
    if pre_spike_train_in.max() == 0:
        pre_spike_in_total = np.zeros(Lt)
    else:
        pre_spike_in_total = pre_spike_train_in.sum(axis=0)
    
    # Create TimedArrays for presynaptic input
    spike_ex_input = TimedArray(pre_spike_ex_total, dt=dt_sim)
    spike_in_input = TimedArray(pre_spike_in_total, dt=dt_sim)
    
    # Define neuron equations
    eqs = '''
    dv/dt = (-(v - E_L) - (gE/g_L)*(v - VE) - (gI/g_L)*(v - VI) + I_inj_val/g_L) / tau_m : volt (unless refractory)
    dgE/dt = -gE / tau_syn_E : siemens
    dgI/dt = -gI / tau_syn_I : siemens
    I_inj_val : amp
    '''
    
    # Create neuron group
    G = NeuronGroup(1, model=eqs, 
                    threshold='v > V_th',
                    reset='v = V_reset',
                    refractory=tref,
                    method='euler')
    G.v = V_init
    G.gE = 0 * nS
    G.gI = 0 * nS
    G.I_inj_val = I_inj * pA
    
    # Create monitors
    state_mon = StateMonitor(G, ['v', 'gE', 'gI'], record=True)
    spike_mon = SpikeMonitor(G)
    
    # We need to manually update gE and gI based on presynaptic spikes
    # Use a network_operation for this
    @network_operation(dt=dt_sim)
    def update_conductances(t):
        idx = int(np.round(t / dt_sim))
        if idx < Lt:
            G.gE += gE_bar * spike_ex_input(t)
            G.gI += gI_bar * spike_in_input(t)
    
    # Run simulation
    net = Network(G, state_mon, spike_mon, update_conductances)
    net.run(Lt * dt_sim)
    
    # Extract results
    v = np.array(state_mon.v[0] / mV)
    gE = np.array(state_mon.gE[0] / nS)
    gI = np.array(state_mon.gI[0] / nS)
    rec_spikes = np.array(spike_mon.t / ms)
    
    # Ensure output length matches input
    if len(v) > Lt:
        v = v[:Lt]
        gE = gE[:Lt]
        gI = gI[:Lt]
    elif len(v) < Lt:
        v = np.pad(v, (0, Lt - len(v)), 'edge')
        gE = np.pad(gE, (0, Lt - len(gE)), 'constant')
        gI = np.pad(gI, (0, Lt - len(gI)), 'constant')
    
    return v, rec_spikes, gE, gI


# =============================================================================
# Short-Term Synaptic Plasticity (STP)
# =============================================================================

def dynamic_syn(g_bar, tau_syn, U0, tau_d, tau_f, pre_spike_train, dt):
    """
    Short-term synaptic plasticity model using Brian2.
    
    Args:
        g_bar           : synaptic conductance strength [nS]
        tau_syn         : synaptic time constant [ms]
        U0              : synaptic release probability at rest
        tau_d           : depression time constant [ms]
        tau_f           : facilitation time constant [ms]
        pre_spike_train : presynaptic spike train (1D array, 1 if spike)
        dt              : time step [ms]
    
    Returns:
        u : release probability
        R : available resources
        g : postsynaptic conductance
    """
    start_scope()
    
    Lt = len(pre_spike_train)
    dt_sim = dt * ms
    tau_syn_brian = tau_syn * ms
    tau_d_brian = tau_d * ms
    tau_f_brian = tau_f * ms
    g_bar_brian = g_bar * nS
    
    defaultclock.dt = dt_sim
    
    # Create TimedArray for presynaptic spikes
    spike_input = TimedArray(pre_spike_train, dt=dt_sim)
    
    # Define STP equations
    # Note: We track u and R as dimensionless quantities
    eqs = '''
    du/dt = -u / tau_f_brian : 1
    dR/dt = (1 - R) / tau_d_brian : 1
    dg/dt = -g / tau_syn_brian : siemens
    '''
    
    # Create neuron group (just for tracking STP dynamics)
    G = NeuronGroup(1, model=eqs, method='euler')
    G.u = 0
    G.R = 1
    G.g = 0 * nS
    
    # State monitor
    state_mon = StateMonitor(G, ['u', 'R', 'g'], record=True)
    
    # Network operation to handle spike-triggered updates
    @network_operation(dt=dt_sim)
    def update_stp(t):
        idx = int(np.round(t / dt_sim))
        if idx < Lt and pre_spike_train[idx] > 0.5:
            # Update u first (facilitation)
            u_old = G.u[0]
            G.u = u_old + U0 * (1.0 - u_old)
            u_new = G.u[0]
            
            # Update g based on new u and current R
            R_old = G.R[0]
            G.g = G.g + g_bar_brian * u_new * R_old
            
            # Update R (depression)
            G.R = R_old - u_new * R_old
    
    # Run simulation
    net = Network(G, state_mon, update_stp)
    net.run(Lt * dt_sim)
    
    # Extract results
    u = np.array(state_mon.u[0])
    R = np.array(state_mon.R[0])
    g = np.array(state_mon.g[0] / nS)
    
    # Ensure output length matches input
    if len(u) > Lt:
        u = u[:Lt]
        R = R[:Lt]
        g = g[:Lt]
    elif len(u) < Lt:
        u = np.pad(u, (0, Lt - len(u)), 'edge')
        R = np.pad(R, (0, Lt - len(R)), 'edge')
        g = np.pad(g, (0, Lt - len(g)), 'constant')
    
    return u, R, g


# =============================================================================
# STDP Functions
# =============================================================================

def default_pars_STDP(**kwargs):
    """
    Default parameters for STDP simulation.
    """
    pars = {}
    
    # Neuron parameters
    pars['V_th'] = -55.     # spike threshold [mV]
    pars['V_reset'] = -75.  # reset potential [mV]
    pars['tau_m'] = 10.     # membrane time constant [ms]
    pars['g_L'] = 10.       # leak conductance [nS]
    pars['V_init'] = -65.   # initial potential [mV]
    pars['V_L'] = -75.      # leak reversal potential [mV] (also E_L)
    pars['E_L'] = -75.      # leak reversal potential [mV]
    pars['tref'] = 2.       # refractory time (ms)
    
    # STDP parameters
    pars['A_plus'] = 0.008                   # magnitude of LTP
    pars['A_minus'] = pars['A_plus'] * 1.10  # magnitude of LTD
    pars['tau_stdp'] = 20.                   # STDP time constant [ms]
    
    # Simulation parameters
    pars['T'] = 400.
    pars['dt'] = .1
    
    for k in kwargs:
        pars[k] = kwargs[k]
    
    pars['range_t'] = np.arange(0, pars['T'], pars['dt'])
    
    return pars


def Delta_W(time_diff, A_plus, A_minus, tau_stdp):
    """
    Compute STDP weight change.
    
    Args:
        time_diff : t_pre - t_post (array)
        A_plus    : LTP magnitude
        A_minus   : LTD magnitude
        tau_stdp  : STDP time constant [ms]
    
    Returns:
        dW : weight change
    """
    time_diff = np.asarray(time_diff)
    dW = np.zeros(len(time_diff))
    
    # LTP: pre before post (time_diff <= 0)
    dW[time_diff <= 0] = A_plus * np.exp(time_diff[time_diff <= 0] / tau_stdp)
    
    # LTD: post before pre (time_diff > 0)
    dW[time_diff > 0] = -A_minus * np.exp(-time_diff[time_diff > 0] / tau_stdp)
    
    return dW


def generate_P(pars, pre_spike_train_ex):
    """
    Generate presynaptic trace P for STDP.
    
    Args:
        pars               : parameter dictionary
        pre_spike_train_ex : presynaptic spike trains (n_syn x Lt)
    
    Returns:
        P : presynaptic trace (LTP indicator), same shape as input
    """
    A_plus, tau_stdp = pars['A_plus'], pars['tau_stdp']
    dt, range_t = pars['dt'], pars['range_t']
    Lt = range_t.size
    
    P = np.zeros(pre_spike_train_ex.shape)
    
    for it in range(Lt - 1):
        # Exponential decay + spike-triggered increment
        dP = -(dt / tau_stdp) * P[:, it] + A_plus * pre_spike_train_ex[:, it + 1]
        P[:, it + 1] = P[:, it] + dP
    
    return P

def plot_spike_raster(pars, pre_spike_train, rec_spikes):
    plt.figure(figsize=(12, 3))
    
    # 畫前級脈衝 (Pre spikes) - 取前 10 個神經元作為代表，用小垂線
    # 我們只畫出一部分神經元以保持圖面清晰
    n_plot = min(10, pre_spike_train.shape[0])
    for i in range(n_plot):
        spike_times = pars['range_t'][pre_spike_train[i] > 0] / 1000. # 換算成秒
        plt.vlines(spike_times, i, i + 0.6, colors='gray', lw=1, alpha=0.5)
    
    # 畫後級脈衝 (Post spikes) - 用長垂線 (跨越所有 pre 的高度)
    if len(rec_spikes) > 0:
        plt.vlines(rec_spikes / 1000., -1, n_plot, colors='red', lw=2, label='Post-synaptic')
    
    plt.title('Spike Raster Plot')
    plt.xlabel('Time (s)')
    plt.ylabel('Pre Neuron ID')
    plt.yticks(range(n_plot))
    plt.ylim(-1, n_plot)
    plt.legend(loc='upper right')
    plt.tight_layout()
    plt.show()

def run_LIF_cond_STDP(pars, pre_spike_train_ex):
    """
    Conductance-based LIF with STDP using Brian2.
    
    Args:
        pars               : parameter dictionary
        pre_spike_train_ex : excitatory presynaptic spike trains (n_syn x Lt)
    
    Returns:
        v             : membrane potential [mV]
        rec_spikes    : spike times [ms]
        gE            : total excitatory conductance [nS]
        P             : presynaptic traces
        M             : postsynaptic trace
        gE_bar_update : individual synaptic weights over time (n_syn x Lt)
    """
    start_scope()
    
    # Retrieve parameters
    V_th_val = pars['V_th']
    V_reset_val = pars['V_reset']
    tau_m_val = pars['tau_m']
    g_L_val = pars.get('g_L', 10.)
    V_init_val = pars['V_init']
    V_L_val = pars['V_L']
    gE_bar_val = pars['gE_bar']
    gE_init_val = pars['gE_init']
    VE_val = pars['VE']
    tau_syn_E_val = pars['tau_syn_E']
    tref_val = pars['tref']
    A_plus_val = pars['A_plus']
    A_minus_val = pars['A_minus']
    tau_stdp_val = pars['tau_stdp']
    dt_val = pars['dt']
    range_t = pars['range_t']
    Lt = range_t.size
    
    n_syn = pre_spike_train_ex.shape[0]
    
    # Generate presynaptic traces P (for LTP)
    P = generate_P(pars, pre_spike_train_ex)

    # Initialize arrays for manual simulation
    # (Brian2's STDP is complex for arbitrary spike trains, so we use hybrid approach)
    v = np.zeros(Lt)
    v[0] = V_init_val
    M = np.zeros(Lt)  # Postsynaptic trace (for LTD)
    gE = np.zeros(Lt)  # Total excitatory conductance
    
    # Synaptic weights
    gE_bar_update = np.zeros((n_syn, Lt))
    if np.isscalar(gE_init_val):
        gE_bar_update[:, 0] = gE_init_val
    else:
        gE_bar_update[:, 0] = gE_init_val
    
    # Simulation loop (hybrid: use numpy for flexibility with STDP)
    tr = 0.  # Refractory counter
    rec_spikes = []
    
    for it in range(Lt - 1):
        if tr > 0:
            v[it] = V_reset_val
            tr = tr - 1
        elif v[it] >= V_th_val: # SPIKING !!!
            rec_spikes.append(it)
            v[it] = V_reset_val
            # Update M (LTD trace) - becomes more negative
            M[it] = M[it] - A_minus_val
            # LTP: increase weights based on presynaptic trace
            gE_bar_update[:, it] = gE_bar_update[:, it] + P[:, it] * gE_bar_val
            # Clip to max
            gE_bar_update[gE_bar_update[:, it] > gE_bar_val, it] = gE_bar_val
            tr = tref_val / dt_val
        
        # Update M (decay)
        M[it + 1] = M[it] - dt_val / tau_stdp_val * M[it]
        
        # Update total conductance

        
        # LTD: decrease weights when presynaptic spikes after postsynaptic
        gE_bar_update[:, it + 1] = gE_bar_update[:, it] + \
                                   M[it] * pre_spike_train_ex[:, it] * gE_bar_val
        # Clip to min (0)
        gE_bar_update[gE_bar_update[:, it + 1] < 0, it + 1] = 0.
        gE[it + 1] = gE[it] - (dt_val / tau_syn_E_val) * gE[it] + \
                (gE_bar_update[:, it] * pre_spike_train_ex[:, it]).sum()
        # Membrane potential update (conductance-based LIF)
        dv = (-(v[it] - V_L_val) - (gE[it + 1] / g_L_val) * (v[it] - VE_val)) * (dt_val / tau_m_val)
        v[it + 1] = v[it] + dv
    
    rec_spikes = np.array(rec_spikes) * dt_val
    
    return v, rec_spikes, gE, P, M, gE_bar_update


# =============================================================================
# Plotting Functions for STDP
# =============================================================================

def plot_volt_trace(pars, v, sp, show=True):
    """
    Plot trajectory of membrane potential for a single neuron.
    """
    V_th = pars['V_th']
    dt = pars['dt']
    v_plot = v.copy()
    if sp.size:
        sp_num = (sp / dt).astype(int) - 1
        sp_num = sp_num[sp_num < len(v_plot)]
        v_plot[sp_num] += 10
    
    plt.plot(pars['range_t'], v_plot, 'b')
    plt.axhline(V_th, 0, 1, color='k', ls='--', lw=1.)
    plt.xlabel('Time (ms)')
    plt.ylabel('V (mV)')
    if show:
        plt.show()


def my_raster_plot(range_t, spike_train, n):
    """
    Generates raster plot of spike trains.
    """
    N = spike_train.shape[0]
    if n > N:
        n = N
    
    for i in range(n):
        if spike_train[i, :].sum() > 0.:
            t_sp = range_t[spike_train[i, :] > 0.5]
            plt.plot(t_sp, i * np.ones(len(t_sp)), 'k|', ms=10, markeredgewidth=2)
    plt.xlim([range_t[0], range_t[-1]])
    plt.ylim([-0.5, n + 0.5])
    plt.xlabel('Time (ms)')
    plt.ylabel('Neuron ID')


def my_illus_LIFSYN(pars, v_fmp, v):
    """
    Illustration of FMP and membrane voltage.
    """
    plt.figure(figsize=(14, 5))
    plt.plot(pars['range_t'], v_fmp, 'r', lw=1., label='Free mem. pot.', zorder=2)
    plt.plot(pars['range_t'], v, 'b', lw=1., label='True mem. pot', zorder=1, alpha=0.7)
    plt.axhline(pars['V_th'], 0, 1, color='k', lw=2., ls='--', label='Spike Threshold', zorder=1)
    plt.axhline(np.mean(v_fmp), 0, 1, color='r', lw=2., ls='--', label='Mean Free Mem. Pot.', zorder=1)
    plt.xlabel('Time (ms)')
    plt.ylabel('V (mV)')
    plt.legend(loc=[1.02, 0.68])
    plt.show()


def plot_STDP_kernel(A_plus, A_minus, tau_stdp):
    """
    Plot the STDP learning kernel.
    """
    time_diff = np.linspace(-5 * tau_stdp, 5 * tau_stdp, 100)
    dW = Delta_W(time_diff, A_plus, A_minus, tau_stdp)
    
    plt.figure(figsize=(10, 6))
    plt.axhline(0, color='k', linestyle=':', alpha=0.5)
    plt.axvline(0, color='k', linestyle=':', alpha=0.5)
    
    plt.plot(time_diff[time_diff <= 0], dW[time_diff <= 0], 'b-', linewidth=2, label='LTP')
    plt.plot(time_diff[time_diff > 0], dW[time_diff > 0], 'r-', linewidth=2, label='LTD')
    
    plt.fill_between(time_diff[time_diff <= 0], dW[time_diff <= 0], alpha=0.3, color='blue')
    plt.fill_between(time_diff[time_diff > 0], dW[time_diff > 0], alpha=0.3, color='red')
    
    plt.xlabel(r'$t_{pre} - t_{post}$ (ms)', fontsize=12)
    plt.ylabel(r'$\Delta W$', fontsize=12)
    plt.title('STDP Learning Kernel', fontsize=14, fontweight='bold')
    plt.legend()
    
    plt.annotate('Pre before Post\n(Potentiation)', xy=(-50, A_plus*0.5),
                 fontsize=10, ha='center')
    plt.annotate('Post before Pre\n(Depression)', xy=(50, -A_minus*0.5),
                 fontsize=10, ha='center')
    
    plt.tight_layout()
    plt.show()
